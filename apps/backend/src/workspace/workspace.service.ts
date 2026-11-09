import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SaveDraftDto } from './dto/workspace.dto';
import {
  AuthTeamUser,
  WorkspaceDraftDto,
  DEFAULT_STARTER_CODES,
} from '@ignitron/shared';

@Injectable()
export class WorkspaceService {
  private readonly logger = new Logger(WorkspaceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Load the team's saved draft for the target or current round
   */
  async getDraft(
    teamUser: AuthTeamUser,
    requestedRoundNumber?: number,
  ): Promise<WorkspaceDraftDto> {
    const round = await this.resolveTargetRound(requestedRoundNumber);

    const draft = await this.prisma.workspaceDraft.findUnique({
      where: {
        teamId_roundId: {
          teamId: teamUser.id,
          roundId: round.id,
        },
      },
    });

    if (draft) {
      return {
        teamId: draft.teamId,
        roundNumber: round.roundNumber,
        roundId: draft.roundId,
        sourceCode: draft.sourceCode,
        language: draft.language as any,
        version: draft.version,
        lastEditedByParticipantId: draft.lastEditedByParticipantId,
        updatedAt: draft.updatedAt.toISOString(),
        isStarterTemplate: false,
      };
    }

    // Default starter template
    const defaultLang = 'cpp';
    return {
      teamId: teamUser.id,
      roundNumber: round.roundNumber,
      roundId: round.id,
      sourceCode: DEFAULT_STARTER_CODES[defaultLang] || '',
      language: defaultLang,
      version: 0,
      lastEditedByParticipantId: null,
      updatedAt: new Date().toISOString(),
      isStarterTemplate: true,
    };
  }

  /**
   * Save / autosave draft for the authenticated team with active session mutex check
   */
  async saveDraft(
    dto: SaveDraftDto,
    teamUser: AuthTeamUser,
  ): Promise<WorkspaceDraftDto> {
    // 1. Strictly verify active participant session mutex
    await this.verifyActiveParticipantSession(teamUser);

    // 2. Resolve round
    const round = await this.resolveTargetRound(dto.roundNumber);

    // 3. Verify Competition State & Team Eligibility
    await this.validateCompetitionStateAndEligibility(teamUser, round.roundNumber);

    // 4. Stale request / version concurrency check
    const existing = await this.prisma.workspaceDraft.findUnique({
      where: {
        teamId_roundId: {
          teamId: teamUser.id,
          roundId: round.id,
        },
      },
    });

    if (
      dto.expectedVersion !== undefined &&
      existing &&
      existing.version > dto.expectedVersion
    ) {
      throw new ConflictException(
        'Workspace draft was updated by another participant session. Please reload to view latest changes.',
      );
    }

    // 5. Upsert workspace draft
    const updated = await this.prisma.workspaceDraft.upsert({
      where: {
        teamId_roundId: {
          teamId: teamUser.id,
          roundId: round.id,
        },
      },
      create: {
        teamId: teamUser.id,
        roundId: round.id,
        sourceCode: dto.sourceCode,
        language: dto.language,
        version: 1,
        lastEditedByParticipantId: teamUser.activeParticipant.id,
      },
      update: {
        sourceCode: dto.sourceCode,
        language: dto.language,
        version: { increment: 1 },
        lastEditedByParticipantId: teamUser.activeParticipant.id,
      },
    });

    return {
      teamId: updated.teamId,
      roundNumber: round.roundNumber,
      roundId: updated.roundId,
      sourceCode: updated.sourceCode,
      language: updated.language as any,
      version: updated.version,
      lastEditedByParticipantId: updated.lastEditedByParticipantId,
      updatedAt: updated.updatedAt.toISOString(),
      isStarterTemplate: false,
    };
  }

  /**
   * Verify participant holds the active team session
   */
  private async verifyActiveParticipantSession(teamUser: AuthTeamUser): Promise<void> {
    const activeSession = await this.prisma.teamSession.findFirst({
      where: {
        teamId: teamUser.id,
        participantId: teamUser.activeParticipant.id,
        status: 'ACTIVE',
      },
      orderBy: { lastActivityAt: 'desc' },
    });

    if (!activeSession) {
      throw new ForbiddenException(
        'Participant does not hold the active team session. Terminal control belongs to the active relay participant.',
      );
    }
  }

  /**
   * Resolve competition round
   */
  private async resolveTargetRound(roundNumber?: number) {
    if (roundNumber) {
      const round = await this.prisma.competitionRound.findUnique({
        where: { roundNumber },
      });
      if (round) return round;
    }

    const state = await this.prisma.competitionState.findUnique({
      where: { id: 'global' },
    });

    const activeNum = state?.currentRoundNumber || 1;
    let round = await this.prisma.competitionRound.findUnique({
      where: { roundNumber: activeNum },
    });

    if (!round) {
      round = await this.prisma.competitionRound.findFirst({
        orderBy: { roundNumber: 'asc' },
      });
    }

    if (!round) {
      throw new NotFoundException('Competition round definition not found in database.');
    }

    return round;
  }

  /**
   * Validate competition status, pause state, round deadline and team eligibility
   */
  private async validateCompetitionStateAndEligibility(
    teamUser: AuthTeamUser,
    roundNumber: number,
  ): Promise<void> {
    const state = await this.prisma.competitionState.findUnique({
      where: { id: 'global' },
    });

    if (!state) return;

    // Only strictly block if competition is officially in an active or evaluation round
    const isRoundActive =
      (roundNumber === 1 && state.status === 'ROUND_1_ACTIVE') ||
      (roundNumber === 2 && state.status === 'ROUND_2_ACTIVE') ||
      (roundNumber === 3 && state.status === 'ROUND_3_ACTIVE');

    if (isRoundActive) {
      if (state.isPaused) {
        throw new ForbiddenException('Competition is paused. Workspace changes are temporarily locked.');
      }

      const now = new Date();
      if (state.deadlineAt && state.deadlineAt.getTime() < now.getTime()) {
        throw new ForbiddenException('Round deadline has expired. Workspace drafts are now read-only.');
      }

      // Check eligibility
      const round = await this.prisma.competitionRound.findUnique({
        where: { roundNumber },
      });
      if (round) {
        const progress = await this.prisma.teamRoundProgress.findUnique({
          where: {
            teamId_roundId: {
              teamId: teamUser.id,
              roundId: round.id,
            },
          },
        });

        // Round 1 active teams are eligible by default
        const isEligible =
          progress?.eligibilityStatus === 'ELIGIBLE' ||
          (roundNumber === 1 && progress === null);

        if (!isEligible) {
          throw new ForbiddenException(
            `Team "${teamUser.teamCode}" is not eligible to participate in Round ${roundNumber}.`,
          );
        }
      }
    }
  }
}
