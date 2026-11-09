import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import {
  CompetitionStatus,
  CompetitionStateDto,
  ShortlistingTeamItem,
  ShortlistSubmissionResult,
  TeamCompetitionStatusDto,
  CompetitionActivityLogItem,
  OFFICIAL_ROUNDS_CONFIG,
} from '@ignitron/shared';
import { PrismaService } from '../database/prisma.service';
import {
  RoundControlDto,
  ShortlistSubmissionDto,
  GenerateDemoDataDto,
} from './dto/competition.dto';

@Injectable()
export class CompetitionService implements OnModuleInit {
  private readonly logger = new Logger(CompetitionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.getOrCreateGlobalState();
  }

  /**
   * Retrieves or initializes the single authoritative global competition state
   */
  async getOrCreateGlobalState() {
    let state = await this.prisma.competitionState.findUnique({
      where: { id: 'global' },
    });

    if (!state) {
      state = await this.prisma.competitionState.create({
        data: {
          id: 'global',
          status: 'STANDBY',
          isPaused: false,
        },
      });
      this.logger.log('Authoritative global competition state initialized: STANDBY');
    }

    return state;
  }

  /**
   * Returns authoritative global state with server timer and statistics
   */
  async getCompetitionState(): Promise<CompetitionStateDto> {
    const state = await this.getOrCreateGlobalState();
    const now = new Date();

    let currentRoundName: string | null = null;
    let eligibleTeamsCount = 0;
    let participatingTeamsCount = 0;
    let completedTeamsCount = 0;

    const totalTeamsCount = await this.prisma.team.count({
      where: { isActive: true },
    });

    if (state.currentRoundNumber) {
      const round = await this.prisma.competitionRound.findUnique({
        where: { roundNumber: state.currentRoundNumber },
        include: {
          teamProgress: true,
        },
      });

      if (round) {
        currentRoundName = round.name;
        eligibleTeamsCount = round.teamProgress.filter(
          (tp) => tp.eligibilityStatus === 'ELIGIBLE',
        ).length;
        participatingTeamsCount = round.teamProgress.filter(
          (tp) => tp.participationStatus === 'IN_PROGRESS' || tp.participationStatus === 'SUBMITTED',
        ).length;
        completedTeamsCount = round.teamProgress.filter(
          (tp) => tp.participationStatus === 'SUBMITTED',
        ).length;
      }
    } else {
      eligibleTeamsCount = totalTeamsCount;
    }

    // Determine valid transitions from current state
    const validTransitions = this.getValidTransitions(state.status, state.isPaused);

    // Calculate real-time remaining duration if active and not paused
    let currentRemainingDuration = state.remainingDurationSeconds;
    if (state.deadlineAt && !state.isPaused) {
      currentRemainingDuration = Math.max(
        0,
        Math.floor((state.deadlineAt.getTime() - now.getTime()) / 1000),
      );
    }

    return {
      id: state.id,
      status: state.status as CompetitionStatus,
      currentRoundNumber: state.currentRoundNumber,
      currentRoundName,
      isPaused: state.isPaused,
      startedAt: state.startedAt ? state.startedAt.toISOString() : null,
      deadlineAt: state.deadlineAt ? state.deadlineAt.toISOString() : null,
      pausedAt: state.pausedAt ? state.pausedAt.toISOString() : null,
      remainingDurationSeconds: currentRemainingDuration,
      totalDurationSeconds: state.totalDurationSeconds,
      serverTime: now.toISOString(),
      totalTeamsCount,
      eligibleTeamsCount,
      participatingTeamsCount,
      completedTeamsCount,
      validTransitions,
    };
  }

  /**
   * Defines allowed state machine transitions to prevent invalid sequences
   */
  private getValidTransitions(status: string, isPaused: boolean): string[] {
    switch (status) {
      case 'STANDBY':
        return ['START_ROUND_1'];
      case 'ROUND_1_ACTIVE':
        return isPaused
          ? ['RESUME_ROUND', 'END_ROUND']
          : ['PAUSE_ROUND', 'END_ROUND'];
      case 'ROUND_1_EVALUATION':
        return ['START_ROUND_2'];
      case 'ROUND_2_ACTIVE':
        return isPaused
          ? ['RESUME_ROUND', 'END_ROUND']
          : ['PAUSE_ROUND', 'END_ROUND'];
      case 'ROUND_2_EVALUATION':
        return ['START_ROUND_3'];
      case 'ROUND_3_ACTIVE':
        return isPaused
          ? ['RESUME_ROUND', 'END_ROUND']
          : ['PAUSE_ROUND', 'END_ROUND'];
      case 'FINAL_EVALUATION':
        return ['COMPLETE_COMPETITION'];
      case 'COMPLETED':
        return ['RESET_COMPETITION'];
      default:
        return [];
    }
  }

  /**
   * Executes atomic administrator round control actions
   */
  async executeRoundControl(dto: RoundControlDto, adminId: string) {
    const state = await this.getOrCreateGlobalState();
    const now = new Date();

    return await this.prisma.$transaction(async (tx) => {
      // Re-verify current state inside transaction to prevent duplicate concurrency
      const currentState = await tx.competitionState.findUnique({
        where: { id: 'global' },
      });

      if (!currentState) {
        throw new NotFoundException('Global competition state record missing');
      }

      switch (dto.action) {
        case 'START_ROUND_1': {
          if (currentState.status !== 'STANDBY') {
            throw new BadRequestException(
              `Cannot start Round 1 from state "${currentState.status}". Must be in STANDBY.`,
            );
          }

          const r1 = await tx.competitionRound.findUnique({
            where: { roundNumber: 1 },
          });
          if (!r1) throw new NotFoundException('Round 1 definition not found');

          // Duration in seconds (30 minutes = 1800s)
          const durationSeconds = r1.durationMinutes * 60;
          const deadline = new Date(now.getTime() + durationSeconds * 1000);

          // All active teams with complete participant records (>=2) are eligible for Round 1
          const activeTeams = await tx.team.findMany({
            where: {
              isActive: true,
              participants: { some: {} },
            },
            include: { participants: true },
          });

          for (const team of activeTeams) {
            await tx.teamRoundProgress.upsert({
              where: {
                teamId_roundId: {
                  teamId: team.id,
                  roundId: r1.id,
                },
              },
              update: {
                eligibilityStatus: 'ELIGIBLE',
                participationStatus: 'NOT_STARTED',
              },
              create: {
                teamId: team.id,
                roundId: r1.id,
                eligibilityStatus: 'ELIGIBLE',
                participationStatus: 'NOT_STARTED',
                score: 0,
              },
            });
          }

          // Update Competition Round status
          await tx.competitionRound.update({
            where: { id: r1.id },
            data: { status: 'ACTIVE' },
          });

          // Update Global State
          await tx.competitionState.update({
            where: { id: 'global' },
            data: {
              status: 'ROUND_1_ACTIVE',
              currentRoundNumber: 1,
              isPaused: false,
              startedAt: now,
              deadlineAt: deadline,
              pausedAt: null,
              totalDurationSeconds: durationSeconds,
              remainingDurationSeconds: durationSeconds,
            },
          });

          await tx.activityLog.create({
            data: {
              actorType: 'ADMIN',
              actorId: adminId,
              action: 'ROUND_1_STARTED',
              description: `Admin started Round 1: MCQ Arena (${activeTeams.length} teams eligible)`,
              metadata: { roundNumber: 1, eligibleCount: activeTeams.length },
            },
          });

          return { message: 'Round 1 successfully started' };
        }

        case 'PAUSE_ROUND': {
          if (
            !['ROUND_1_ACTIVE', 'ROUND_2_ACTIVE', 'ROUND_3_ACTIVE'].includes(
              currentState.status,
            )
          ) {
            throw new BadRequestException('Cannot pause when no round is active');
          }
          if (currentState.isPaused) {
            throw new BadRequestException('Active round is already paused');
          }

          const remainingSeconds = currentState.deadlineAt
            ? Math.max(
                0,
                Math.floor(
                  (currentState.deadlineAt.getTime() - now.getTime()) / 1000,
                ),
              )
            : 0;

          await tx.competitionState.update({
            where: { id: 'global' },
            data: {
              isPaused: true,
              pausedAt: now,
              remainingDurationSeconds: remainingSeconds,
            },
          });

          if (currentState.currentRoundNumber) {
            await tx.competitionRound.update({
              where: { roundNumber: currentState.currentRoundNumber },
              data: { status: 'PAUSED' },
            });
          }

          await tx.activityLog.create({
            data: {
              actorType: 'ADMIN',
              actorId: adminId,
              action: 'ROUND_PAUSED',
              description: `Admin paused Round ${currentState.currentRoundNumber} with ${remainingSeconds}s remaining`,
              metadata: {
                roundNumber: currentState.currentRoundNumber,
                remainingSeconds,
              },
            },
          });

          return { message: 'Round paused successfully' };
        }

        case 'RESUME_ROUND': {
          if (
            !['ROUND_1_ACTIVE', 'ROUND_2_ACTIVE', 'ROUND_3_ACTIVE'].includes(
              currentState.status,
            )
          ) {
            throw new BadRequestException('Cannot resume when no round is active');
          }
          if (!currentState.isPaused) {
            throw new BadRequestException('Round is not currently paused');
          }

          const remainingSeconds = currentState.remainingDurationSeconds || 0;
          const newDeadline = new Date(now.getTime() + remainingSeconds * 1000);

          await tx.competitionState.update({
            where: { id: 'global' },
            data: {
              isPaused: false,
              pausedAt: null,
              deadlineAt: newDeadline,
            },
          });

          if (currentState.currentRoundNumber) {
            await tx.competitionRound.update({
              where: { roundNumber: currentState.currentRoundNumber },
              data: { status: 'ACTIVE' },
            });
          }

          await tx.activityLog.create({
            data: {
              actorType: 'ADMIN',
              actorId: adminId,
              action: 'ROUND_RESUMED',
              description: `Admin resumed Round ${currentState.currentRoundNumber}`,
              metadata: {
                roundNumber: currentState.currentRoundNumber,
                newDeadline: newDeadline.toISOString(),
              },
            },
          });

          return { message: 'Round resumed successfully' };
        }

        case 'END_ROUND': {
          let nextStatus: CompetitionStatus;
          if (currentState.status === 'ROUND_1_ACTIVE') {
            nextStatus = 'ROUND_1_EVALUATION';
          } else if (currentState.status === 'ROUND_2_ACTIVE') {
            nextStatus = 'ROUND_2_EVALUATION';
          } else if (currentState.status === 'ROUND_3_ACTIVE') {
            nextStatus = 'FINAL_EVALUATION';
          } else {
            throw new BadRequestException(
              `Cannot end round from state "${currentState.status}". Round must be active.`,
            );
          }

          const currentRoundNumber = currentState.currentRoundNumber!;
          const currentRound = await tx.competitionRound.findUnique({
            where: { roundNumber: currentRoundNumber },
          });

          if (currentRound) {
            await tx.competitionRound.update({
              where: { id: currentRound.id },
              data: { status: 'COMPLETED' },
            });
          }

          await tx.competitionState.update({
            where: { id: 'global' },
            data: {
              status: nextStatus,
              isPaused: false,
              deadlineAt: now,
              remainingDurationSeconds: 0,
            },
          });

          await tx.activityLog.create({
            data: {
              actorType: 'ADMIN',
              actorId: adminId,
              action: 'ROUND_ENDED',
              description: `Admin ended Round ${currentRoundNumber}. Entered ${nextStatus}.`,
              metadata: {
                endedRound: currentRoundNumber,
                nextStatus,
              },
            },
          });

          return {
            message: `Round ${currentRoundNumber} concluded. Entered ${nextStatus}.`,
          };
        }

        case 'START_ROUND_2': {
          if (currentState.status !== 'ROUND_1_EVALUATION') {
            throw new BadRequestException(
              `Cannot start Round 2 from state "${currentState.status}". Must be in ROUND_1_EVALUATION.`,
            );
          }

          const r2 = await tx.competitionRound.findUnique({
            where: { roundNumber: 2 },
          });
          if (!r2) throw new NotFoundException('Round 2 definition not found');

          // Verify that shortlisting has been conducted (at least 1 team eligible for R2)
          const eligibleR2Count = await tx.teamRoundProgress.count({
            where: {
              roundId: r2.id,
              eligibilityStatus: 'ELIGIBLE',
            },
          });

          if (eligibleR2Count === 0) {
            throw new BadRequestException(
              'Cannot start Round 2: No teams have been shortlisted and marked ELIGIBLE for Round 2.',
            );
          }

          const durationSeconds = r2.durationMinutes * 60; // 40 minutes = 2400s
          const deadline = new Date(now.getTime() + durationSeconds * 1000);

          await tx.competitionRound.update({
            where: { id: r2.id },
            data: { status: 'ACTIVE' },
          });

          await tx.competitionState.update({
            where: { id: 'global' },
            data: {
              status: 'ROUND_2_ACTIVE',
              currentRoundNumber: 2,
              isPaused: false,
              startedAt: now,
              deadlineAt: deadline,
              pausedAt: null,
              totalDurationSeconds: durationSeconds,
              remainingDurationSeconds: durationSeconds,
            },
          });

          await tx.activityLog.create({
            data: {
              actorType: 'ADMIN',
              actorId: adminId,
              action: 'ROUND_2_STARTED',
              description: `Admin started Round 2: Bug Hunt Arena (${eligibleR2Count} qualified teams)`,
              metadata: { roundNumber: 2, qualifiedCount: eligibleR2Count },
            },
          });

          return { message: 'Round 2 successfully started' };
        }

        case 'START_ROUND_3': {
          if (currentState.status !== 'ROUND_2_EVALUATION') {
            throw new BadRequestException(
              `Cannot start Round 3 from state "${currentState.status}". Must be in ROUND_2_EVALUATION.`,
            );
          }

          const r3 = await tx.competitionRound.findUnique({
            where: { roundNumber: 3 },
          });
          if (!r3) throw new NotFoundException('Round 3 definition not found');

          // Verify that shortlisting has been conducted (at least 1 team eligible for R3)
          const eligibleR3Count = await tx.teamRoundProgress.count({
            where: {
              roundId: r3.id,
              eligibilityStatus: 'ELIGIBLE',
            },
          });

          if (eligibleR3Count === 0) {
            throw new BadRequestException(
              'Cannot start Round 3: No finalists have been shortlisted and marked ELIGIBLE for Round 3.',
            );
          }

          const durationSeconds = r3.durationMinutes * 60; // 60 minutes = 3600s
          const deadline = new Date(now.getTime() + durationSeconds * 1000);

          await tx.competitionRound.update({
            where: { id: r3.id },
            data: { status: 'ACTIVE' },
          });

          await tx.competitionState.update({
            where: { id: 'global' },
            data: {
              status: 'ROUND_3_ACTIVE',
              currentRoundNumber: 3,
              isPaused: false,
              startedAt: now,
              deadlineAt: deadline,
              pausedAt: null,
              totalDurationSeconds: durationSeconds,
              remainingDurationSeconds: durationSeconds,
            },
          });

          await tx.activityLog.create({
            data: {
              actorType: 'ADMIN',
              actorId: adminId,
              action: 'ROUND_3_STARTED',
              description: `Admin started Round 3: Final Boss Coding (${eligibleR3Count} finalist teams)`,
              metadata: { roundNumber: 3, qualifiedCount: eligibleR3Count },
            },
          });

          return { message: 'Round 3: Final Boss Coding successfully started' };
        }

        case 'COMPLETE_COMPETITION': {
          if (currentState.status !== 'FINAL_EVALUATION') {
            throw new BadRequestException(
              `Cannot complete competition from state "${currentState.status}". Must be in FINAL_EVALUATION.`,
            );
          }

          await tx.competitionState.update({
            where: { id: 'global' },
            data: {
              status: 'COMPLETED',
              isPaused: false,
              deadlineAt: null,
              remainingDurationSeconds: null,
            },
          });

          await tx.activityLog.create({
            data: {
              actorType: 'ADMIN',
              actorId: adminId,
              action: 'COMPETITION_COMPLETED',
              description: 'Admin officially concluded IGNITRON 2K26 Competition',
              metadata: { completedAt: now.toISOString() },
            },
          });

          return { message: 'IGNITRON 2K26 Competition marked COMPLETED' };
        }

        case 'RESET_COMPETITION': {
          // Protected administrator reset for development/demo resets
          const isDemoOnly = dto.resetType === 'DEMO_ONLY';

          if (isDemoOnly) {
            // Delete demo teams and cascade their progress
            await tx.team.deleteMany({
              where: { isDemo: true },
            });
          }

          // Reset all rounds to UPCOMING
          await tx.competitionRound.updateMany({
            data: { status: 'UPCOMING' },
          });

          // Reset all team round progress records
          await tx.teamRoundProgress.deleteMany({});

          // Reset Global State
          await tx.competitionState.update({
            where: { id: 'global' },
            data: {
              status: 'STANDBY',
              currentRoundNumber: null,
              isPaused: false,
              startedAt: null,
              deadlineAt: null,
              pausedAt: null,
              remainingDurationSeconds: null,
              totalDurationSeconds: null,
            },
          });

          await tx.activityLog.create({
            data: {
              actorType: 'ADMIN',
              actorId: adminId,
              action: 'COMPETITION_RESET',
              description: `Admin reset competition to STANDBY (${isDemoOnly ? 'Demo Teams Cleared' : 'All Progress Cleared'})`,
              metadata: { resetType: dto.resetType || 'FULL_RESET' },
            },
          });

          return { message: 'Competition state successfully reset to STANDBY' };
        }

        default:
          throw new BadRequestException(`Unsupported action: ${dto.action}`);
      }
    });
  }

  /**
   * Retrieves teams eligible for shortlisting into the target round (Round 2 or Round 3)
   */
  async getShortlistingTeams(targetRoundNumber: number): Promise<ShortlistingTeamItem[]> {
    if (![2, 3].includes(targetRoundNumber)) {
      throw new BadRequestException('Shortlisting only applies to Round 2 or Round 3');
    }

    const prevRoundNumber = targetRoundNumber - 1;
    const prevRound = await this.prisma.competitionRound.findUnique({
      where: { roundNumber: prevRoundNumber },
    });
    const targetRound = await this.prisma.competitionRound.findUnique({
      where: { roundNumber: targetRoundNumber },
    });

    if (!prevRound || !targetRound) {
      throw new NotFoundException('Required competition rounds not found');
    }

    // Get all teams that participated/were eligible in previous round
    const prevProgress = await this.prisma.teamRoundProgress.findMany({
      where: {
        roundId: prevRound.id,
        eligibilityStatus: 'ELIGIBLE',
      },
      include: {
        team: {
          include: {
            participants: true,
            roundProgress: {
              where: { roundId: targetRound.id },
            },
          },
        },
      },
      orderBy: {
        score: 'desc',
      },
    });

    return prevProgress.map((p, index) => {
      const targetProgress = p.team.roundProgress[0];
      return {
        teamId: p.team.id,
        teamCode: p.team.teamCode,
        teamName: p.team.teamName,
        institution: p.team.institution,
        isDemo: p.team.isDemo,
        participants: p.team.participants.map((pt) => ({
          fullName: pt.fullName,
          email: pt.email,
        })),
        currentRoundEligibility: p.eligibilityStatus,
        nextRoundEligibility: targetProgress
          ? targetProgress.eligibilityStatus
          : 'PENDING',
        participationStatus: p.participationStatus,
        score: Number(p.score),
        rank: index + 1,
      };
    });
  }

  /**
   * Submits shortlisting decision, marking chosen teams as ELIGIBLE for target round
   */
  async submitShortlisting(
    dto: ShortlistSubmissionDto,
    adminId: string,
  ): Promise<ShortlistSubmissionResult> {
    const targetRoundNumber = dto.roundNumber;
    if (![2, 3].includes(targetRoundNumber)) {
      throw new BadRequestException('Shortlisting only applies to Round 2 or Round 3');
    }

    const prevRoundNumber = targetRoundNumber - 1;
    const prevRound = await this.prisma.competitionRound.findUnique({
      where: { roundNumber: prevRoundNumber },
    });
    const targetRound = await this.prisma.competitionRound.findUnique({
      where: { roundNumber: targetRoundNumber },
    });

    if (!prevRound || !targetRound) {
      throw new NotFoundException('Required competition rounds not found');
    }

    const qualifiedSet = new Set(dto.qualifiedTeamIds);

    // Get all teams from previous round
    const prevProgress = await this.prisma.teamRoundProgress.findMany({
      where: {
        roundId: prevRound.id,
        eligibilityStatus: 'ELIGIBLE',
      },
      select: { teamId: true },
    });

    if (prevProgress.length === 0) {
      throw new BadRequestException('No eligible teams found in previous round to shortlist');
    }

    let qualifiedCount = 0;
    let disqualifiedCount = 0;

    const activityLog = await this.prisma.$transaction(async (tx) => {
      for (const item of prevProgress) {
        const isQualified = qualifiedSet.has(item.teamId);
        if (isQualified) qualifiedCount++;
        else disqualifiedCount++;

        await tx.teamRoundProgress.upsert({
          where: {
            teamId_roundId: {
              teamId: item.teamId,
              roundId: targetRound.id,
            },
          },
          update: {
            eligibilityStatus: isQualified ? 'ELIGIBLE' : 'INELIGIBLE',
            participationStatus: 'NOT_STARTED',
          },
          create: {
            teamId: item.teamId,
            roundId: targetRound.id,
            eligibilityStatus: isQualified ? 'ELIGIBLE' : 'INELIGIBLE',
            participationStatus: 'NOT_STARTED',
            score: 0,
          },
        });
      }

      return await tx.activityLog.create({
        data: {
          actorType: 'ADMIN',
          actorId: adminId,
          action: `SHORTLISTING_ROUND_${targetRoundNumber}`,
          description: `Admin shortlisted ${qualifiedCount} teams for Round ${targetRoundNumber} (${disqualifiedCount} not qualified)`,
          metadata: {
            targetRoundNumber,
            qualifiedCount,
            disqualifiedCount,
            qualifiedTeamIds: dto.qualifiedTeamIds,
            notes: dto.notes,
          },
        },
      });
    });

    return {
      roundNumber: targetRoundNumber,
      totalProcessed: prevProgress.length,
      qualifiedCount,
      disqualifiedCount,
      activityLogId: activityLog.id,
    };
  }

  /**
   * Retrieves specific competition progression status for an authenticated team
   */
  async getTeamCompetitionStatus(teamId: string): Promise<TeamCompetitionStatusDto> {
    const [team, state, rounds] = await Promise.all([
      this.prisma.team.findUnique({
        where: { id: teamId },
        include: {
          roundProgress: {
            include: { round: true },
            orderBy: { round: { roundNumber: 'asc' } },
          },
        },
      }),
      this.getOrCreateGlobalState(),
      this.prisma.competitionRound.findMany({
        orderBy: { roundNumber: 'asc' },
      }),
    ]);

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const now = new Date();
    let currentRound: any = null;
    let eligibilityStatus: any = 'PENDING';
    let participationStatus: any = 'NOT_STARTED';

    if (state.currentRoundNumber) {
      const activeRound = rounds.find((r) => r.roundNumber === state.currentRoundNumber);
      if (activeRound) {
        currentRound = {
          roundNumber: activeRound.roundNumber,
          name: activeRound.name,
          description: activeRound.description,
          durationMinutes: activeRound.durationMinutes,
          maximumMarks: Number(activeRound.maximumMarks),
        };

        const progress = team.roundProgress.find((p) => p.roundId === activeRound.id);
        if (progress) {
          eligibilityStatus = progress.eligibilityStatus;
          participationStatus = progress.participationStatus;
        } else {
          // If Round 1 and no record yet, but team is active -> Eligible
          if (state.currentRoundNumber === 1 && team.isActive) {
            eligibilityStatus = 'ELIGIBLE';
          }
        }
      }
    }

    const isEligible = eligibilityStatus === 'ELIGIBLE';

    let currentRemainingDuration = state.remainingDurationSeconds;
    if (state.deadlineAt && !state.isPaused) {
      currentRemainingDuration = Math.max(
        0,
        Math.floor((state.deadlineAt.getTime() - now.getTime()) / 1000),
      );
    }

    const roundHistory = team.roundProgress.map((p) => ({
      roundNumber: p.round.roundNumber,
      roundName: p.round.name,
      eligibilityStatus: p.eligibilityStatus,
      participationStatus: p.participationStatus,
      score: Number(p.score),
      startedAt: p.startedAt ? p.startedAt.toISOString() : null,
      submittedAt: p.submittedAt ? p.submittedAt.toISOString() : null,
      evaluatedAt: p.evaluatedAt ? p.evaluatedAt.toISOString() : null,
    }));

    return {
      teamId: team.id,
      teamCode: team.teamCode,
      teamName: team.teamName,
      competitionStatus: state.status as CompetitionStatus,
      currentRound,
      eligibilityStatus,
      participationStatus,
      isEligible,
      deadlineAt: state.deadlineAt ? state.deadlineAt.toISOString() : null,
      serverTime: now.toISOString(),
      isPaused: state.isPaused,
      remainingDurationSeconds: currentRemainingDuration,
      roundHistory,
    };
  }

  /**
   * Retrieves recent competition activity logs
   */
  async getRecentActivityLogs(limit = 25): Promise<CompetitionActivityLogItem[]> {
    const logs = await this.prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs.map((l) => ({
      id: l.id,
      actorType: l.actorType,
      actorId: l.actorId,
      action: l.action,
      description: l.description,
      metadata: l.metadata,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  /**
   * Generates a realistic set of labeled demonstration teams with scores for professor demos
   */
  async generateDemoData(dto: GenerateDemoDataDto, adminId: string) {
    const count = dto.count || 20;
    const demoColleges = [
      'Indian Institute of Technology',
      'National Institute of Technology',
      'Birla Institute of Technology',
      'Delhi Technological University',
      'Vellore Institute of Technology',
    ];

    const demoNames = [
      'Byte Bandits', 'Kernel Panic', 'Cyber Knights', 'Quantum Coders', 'Null Pointers',
      'Binary Beasts', 'Stack Overflow', 'Algo Wizards', 'Syntax Sorcerers', 'Bug Busters',
      'Code Crusaders', 'Runtime Rebels', 'Logic Lords', 'Bit Shifters', 'Data Dragons',
      'Pixel Pioneers', 'Lambda Legends', 'Exception Handlers', 'Recursion Riders', 'Terminal Titans',
    ];

    const saltRounds = 10;
    const demoPassword = 'DemoTeam@2026';
    const passwordHash = await bcrypt.hash(demoPassword, saltRounds);

    const createdTeams = [];

    await this.prisma.$transaction(async (tx) => {
      // First clean up any previous demo teams
      await tx.team.deleteMany({
        where: { isDemo: true },
      });

      for (let i = 0; i < count; i++) {
        const teamNum = (i + 1).toString().padStart(2, '0');
        const teamCode = `DEMO-${teamNum}`;
        const teamName = demoNames[i] || `Demo Team ${teamNum}`;
        const college = demoColleges[i % demoColleges.length];

        const p1Name = `Contestant Alpha ${teamNum}`;
        const p1Email = `alpha_${teamNum}@demo.ignitron.local`;
        const p2Name = `Contestant Beta ${teamNum}`;
        const p2Email = `beta_${teamNum}@demo.ignitron.local`;

        const team = await tx.team.create({
          data: {
            teamCode,
            teamName,
            institution: college,
            passwordHash,
            mustChangePassword: false, // pre-cleared for easy demo logins
            isActive: true,
            isDemo: true,
            participants: {
              create: [
                { fullName: p1Name, email: p1Email, studentId: `STU-A${teamNum}` },
                { fullName: p2Name, email: p2Email, studentId: `STU-B${teamNum}` },
              ],
            },
          },
        });

        createdTeams.push({
          teamId: team.id,
          teamCode: team.teamCode,
          teamName: team.teamName,
          credentials: { password: demoPassword },
        });
      }

      await tx.activityLog.create({
        data: {
          actorType: 'ADMIN',
          actorId: adminId,
          action: 'DEMO_DATA_GENERATED',
          description: `Admin seeded ${count} demonstration teams (DEMO-01 to DEMO-${count.toString().padStart(2, '0')})`,
          metadata: { count },
        },
      });
    });

    return {
      message: `Successfully seeded ${count} demonstration teams`,
      teamsCount: createdTeams.length,
      demoPassword,
    };
  }
}
