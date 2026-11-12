import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  AuthTeamUser,
  McqArenaStateDto,
  SaveMcqAnswerDto,
  McqSubmissionResultDto,
  SanitizedQuestionDto,
  QuestionType,
} from '@ignitron/shared';

@Injectable()
export class ArenaService {
  private readonly logger = new Logger(ArenaService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to fetch round by roundNumber
   */
  private async getRound(roundNumber: number) {
    const round = await this.prisma.competitionRound.findFirst({
      where: { roundNumber },
    });
    if (!round) {
      throw new NotFoundException(`Round ${roundNumber} does not exist.`);
    }
    return round;
  }

  /**
   * Helper to fetch or create TeamRoundProgress
   */
  private async getOrCreateTeamProgress(teamId: string, roundId: string) {
    let progress = await this.prisma.teamRoundProgress.findUnique({
      where: { teamId_roundId: { teamId, roundId } },
    });
    if (!progress) {
      progress = await this.prisma.teamRoundProgress.create({
        data: {
          teamId,
          roundId,
          eligibilityStatus: 'ELIGIBLE',
          participationStatus: 'NOT_STARTED',
          score: 0,
        },
      });
    }
    return progress;
  }

  /**
   * Helper to verify if competition round is currently accessible to contestant
   */
  private async checkRoundAccessible(roundNumber: number) {
    const state = await this.prisma.competitionState.findUnique({
      where: { id: 'global' },
    });
    const round = await this.getRound(roundNumber);

    // If global state is not set or round is not active/evaluation
    const isRoundCurrent = state?.currentRoundNumber === roundNumber;
    const isRoundActive =
      round.status === 'ACTIVE' ||
      state?.status === `ROUND_${roundNumber}_ACTIVE` as any;

    return {
      round,
      state,
      isRoundCurrent,
      isRoundActive,
      isPaused: Boolean(state?.isPaused),
      remainingDurationSeconds: state?.remainingDurationSeconds ?? 0,
    };
  }

  // ============================================================================
  // ROUND 1: MCQ ARENA
  // ============================================================================

  /**
   * Get contestant MCQ arena state:
   * Returns timer, questions (without answers), and team's saved answers.
   */
  async getMcqArenaState(teamUser: AuthTeamUser): Promise<McqArenaStateDto> {
    const round = await this.getRound(1);
    const progress = await this.getOrCreateTeamProgress(teamUser.id, round.id);

    // Fetch questions for Round 1
    const rawQuestions = await this.prisma.question.findMany({
      where: { roundId: round.id, isActive: true },
      orderBy: { orderNumber: 'asc' },
    });

    const questions: SanitizedQuestionDto[] = rawQuestions.map((q) => ({
      id: q.id,
      roundNumber: 1,
      type: q.type as QuestionType,
      orderNumber: q.orderNumber,
      caseNumber: q.caseNumber,
      title: q.title,
      description: q.description,
      starterCode: q.starterCode,
      language: q.language,
      marks: Number(q.marks),
      options: (q.options as string[]) || null,
      sampleTestCases: (q.sampleTestCases as any) || null,
      rubric: (q.rubric as any) || null,
    }));

    // Fetch team's saved answers
    const savedAnswers = await this.prisma.teamMcqAnswer.findMany({
      where: { teamId: teamUser.id },
    });

    const answersMap: Record<string, { selectedOption: number | null; isFlagged: boolean }> = {};
    for (const ans of savedAnswers) {
      answersMap[ans.questionId] = {
        selectedOption: ans.selectedOption,
        isFlagged: ans.isFlagged,
      };
    }

    // Get current competition timer state
    const state = await this.prisma.competitionState.findUnique({
      where: { id: 'global' },
    });

    let remainingSeconds = 30 * 60;
    if (state?.currentRoundNumber === 1 && state.remainingDurationSeconds !== null) {
      remainingSeconds = state.remainingDurationSeconds;
    }

    return {
      roundNumber: 1,
      durationMinutes: round.durationMinutes,
      remainingSeconds,
      isPaused: Boolean(state?.isPaused),
      isSubmitted: progress.participationStatus === 'SUBMITTED',
      questions,
      answers: answersMap,
    };
  }

  /**
   * Real-time answer autosave for Round 1 MCQ
   */
  async saveMcqAnswer(teamUser: AuthTeamUser, dto: SaveMcqAnswerDto) {
    const round = await this.getRound(1);
    const progress = await this.getOrCreateTeamProgress(teamUser.id, round.id);

    if (progress.participationStatus === 'SUBMITTED') {
      throw new BadRequestException('Round 1 has already been submitted by your team.');
    }

    // Verify question belongs to Round 1
    const question = await this.prisma.question.findFirst({
      where: { id: dto.questionId, roundId: round.id },
    });
    if (!question) {
      throw new NotFoundException('Question does not exist in Round 1.');
    }

    // Upsert answer
    const answer = await this.prisma.teamMcqAnswer.upsert({
      where: {
        teamId_questionId: {
          teamId: teamUser.id,
          questionId: dto.questionId,
        },
      },
      update: {
        selectedOption: dto.selectedOption,
        isFlagged: dto.isFlagged !== undefined ? dto.isFlagged : undefined,
        updatedAt: new Date(),
      },
      create: {
        teamId: teamUser.id,
        questionId: dto.questionId,
        selectedOption: dto.selectedOption,
        isFlagged: Boolean(dto.isFlagged),
      },
    });

    // Mark progress as IN_PROGRESS if first interaction
    if (progress.participationStatus === 'NOT_STARTED') {
      await this.prisma.teamRoundProgress.update({
        where: { id: progress.id },
        data: {
          participationStatus: 'IN_PROGRESS',
          startedAt: progress.startedAt || new Date(),
        },
      });
    }

    return {
      success: true,
      data: {
        questionId: answer.questionId,
        selectedOption: answer.selectedOption,
        isFlagged: answer.isFlagged,
        savedAt: answer.updatedAt.toISOString(),
      },
    };
  }

  /**
   * Final submission and automatic scoring for Round 1 MCQ
   */
  async submitMcqRound(teamUser: AuthTeamUser, autoSubmit = false): Promise<McqSubmissionResultDto> {
    const round = await this.getRound(1);
    const progress = await this.getOrCreateTeamProgress(teamUser.id, round.id);

    if (progress.participationStatus === 'SUBMITTED') {
      const breakdown = (progress.scoreBreakdown as any) || {};
      return {
        totalQuestions: breakdown.totalQuestions || 15,
        answeredCount: breakdown.answeredCount || 0,
        correctCount: breakdown.correctCount || 0,
        score: Number(progress.score),
        maximumMarks: 30,
        submittedAt: progress.submittedAt ? progress.submittedAt.toISOString() : new Date().toISOString(),
      };
    }

    // Fetch all questions for Round 1 with correct answers
    const questions = await this.prisma.question.findMany({
      where: { roundId: round.id, isActive: true },
      orderBy: { orderNumber: 'asc' },
    });

    // Fetch team's saved answers
    const answers = await this.prisma.teamMcqAnswer.findMany({
      where: { teamId: teamUser.id },
    });

    const answersMap = new Map<string, number | null>();
    for (const a of answers) {
      answersMap.set(a.questionId, a.selectedOption);
    }

    let correctCount = 0;
    let answeredCount = 0;

    for (const q of questions) {
      const selected = answersMap.get(q.id);
      if (selected !== undefined && selected !== null) {
        answeredCount++;
        if (q.correctOption !== null && selected === q.correctOption) {
          correctCount++;
        }
      }
    }

    const calculatedScore = correctCount * 2.0; // 2 marks each
    const now = new Date();

    const scoreBreakdown = {
      totalQuestions: questions.length,
      answeredCount,
      correctCount,
      autoSubmit,
    };

    // Update TeamRoundProgress
    await this.prisma.teamRoundProgress.update({
      where: { id: progress.id },
      data: {
        score: calculatedScore,
        scoreBreakdown,
        participationStatus: 'SUBMITTED',
        submittedAt: now,
        evaluatedAt: now,
      },
    });

    // Log activity
    await this.prisma.activityLog.create({
      data: {
        actorType: 'TEAM',
        actorId: teamUser.id,
        action: 'SUBMIT_MCQ_ARENA',
        description: `Team "${teamUser.teamName}" (${teamUser.teamCode}) submitted Round 1 MCQs. Score: ${calculatedScore}/30 (${correctCount}/${questions.length} correct).`,
        metadata: {
          teamId: teamUser.id,
          roundNumber: 1,
          score: calculatedScore,
          correctCount,
          answeredCount,
          totalQuestions: questions.length,
          autoSubmit,
        },
      },
    });

    return {
      totalQuestions: questions.length,
      answeredCount,
      correctCount,
      score: calculatedScore,
      maximumMarks: 30,
      submittedAt: now.toISOString(),
    };
  }

  // ============================================================================
  // WORKSPACE DRAFTS & CODE SUBMISSIONS (ROUNDS 2 & 3)
  // ============================================================================

  /**
   * Get draft for a team in a specific round and case number
   */
  async getWorkspaceDraft(teamUser: AuthTeamUser, roundNumber: number, caseNumber = 1) {
    const round = await this.getRound(roundNumber);

    const draft = await this.prisma.workspaceDraft.findUnique({
      where: {
        teamId_roundId_caseNumber: {
          teamId: teamUser.id,
          roundId: round.id,
          caseNumber,
        },
      },
    });

    if (draft) {
      return {
        sourceCode: draft.sourceCode,
        language: draft.language,
        version: draft.version,
        updatedAt: draft.updatedAt.toISOString(),
      };
    }

    // Default starter code from question if draft does not exist
    const question = await this.prisma.question.findFirst({
      where: {
        roundId: round.id,
        caseNumber: roundNumber === 3 ? caseNumber : null,
      },
      orderBy: { orderNumber: 'asc' },
    });

    return {
      sourceCode: question?.starterCode || '// Write your solution here\n',
      language: question?.language || 'typescript',
      version: 0,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Save workspace draft (real-time autosave / sync)
   */
  async saveWorkspaceDraft(
    teamUser: AuthTeamUser,
    roundNumber: number,
    caseNumber: number,
    sourceCode: string,
    language: string,
  ) {
    const round = await this.getRound(roundNumber);
    const progress = await this.getOrCreateTeamProgress(teamUser.id, round.id);

    const draft = await this.prisma.workspaceDraft.upsert({
      where: {
        teamId_roundId_caseNumber: {
          teamId: teamUser.id,
          roundId: round.id,
          caseNumber,
        },
      },
      update: {
        sourceCode,
        language,
        version: { increment: 1 },
        lastEditedByParticipantId: teamUser.activeParticipant.id,
        updatedAt: new Date(),
      },
      create: {
        teamId: teamUser.id,
        roundId: round.id,
        caseNumber,
        sourceCode,
        language,
        version: 1,
        lastEditedByParticipantId: teamUser.activeParticipant.id,
      },
    });

    if (progress.participationStatus === 'NOT_STARTED') {
      await this.prisma.teamRoundProgress.update({
        where: { id: progress.id },
        data: {
          participationStatus: 'IN_PROGRESS',
          startedAt: new Date(),
        },
      });
    }

    return {
      success: true,
      version: draft.version,
      updatedAt: draft.updatedAt.toISOString(),
    };
  }

  /**
   * Submit final code for Round 2 or Round 3 case
   */
  async submitCode(
    teamUser: AuthTeamUser,
    roundNumber: number,
    caseNumber: number,
    sourceCode: string,
    language: string,
  ) {
    const round = await this.getRound(roundNumber);
    const progress = await this.getOrCreateTeamProgress(teamUser.id, round.id);

    // Resolve question
    const question = await this.prisma.question.findFirst({
      where: {
        roundId: round.id,
        caseNumber: roundNumber === 3 ? caseNumber : null,
      },
      orderBy: { orderNumber: 'asc' },
    });

    // Create Submission record
    const submission = await this.prisma.submission.create({
      data: {
        teamId: teamUser.id,
        roundId: round.id,
        questionId: question?.id || null,
        language,
        sourceCode,
        submissionStatus: 'PENDING',
        isTestRun: false,
      },
    });

    // Update progress status
    await this.prisma.teamRoundProgress.update({
      where: { id: progress.id },
      data: {
        participationStatus: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });

    // Log submission
    await this.prisma.activityLog.create({
      data: {
        actorType: 'TEAM',
        actorId: teamUser.id,
        action: 'SUBMIT_CODE',
        description: `Team "${teamUser.teamName}" (${teamUser.teamCode}) submitted code for Round ${roundNumber}${
          roundNumber === 3 ? ` Case ${caseNumber}` : ''
        }.`,
        metadata: {
          teamId: teamUser.id,
          roundNumber,
          caseNumber,
          submissionId: submission.id,
          language,
        },
      },
    });

    return {
      submissionId: submission.id,
      status: submission.submissionStatus,
      submittedAt: submission.submittedAt.toISOString(),
      message: 'Code submitted successfully and queued for evaluation.',
    };
  }
}
