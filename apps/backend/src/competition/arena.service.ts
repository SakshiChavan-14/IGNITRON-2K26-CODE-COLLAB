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
   * Helper to fetch or create TeamRoundProgress with strict eligibility checks
   */
  private async getOrCreateTeamProgress(teamId: string, roundId: string, roundNumber: number) {
    let progress = await this.prisma.teamRoundProgress.findUnique({
      where: { teamId_roundId: { teamId, roundId } },
    });

    if (!progress) {
      if (roundNumber === 1) {
        // Round 1: All registered active teams are eligible by default
        progress = await this.prisma.teamRoundProgress.create({
          data: {
            teamId,
            roundId,
            eligibilityStatus: 'ELIGIBLE',
            participationStatus: 'NOT_STARTED',
            score: 0,
          },
        });
      } else {
        // Rounds 2 and 3: Must be shortlisted by an administrator
        throw new ForbiddenException(
          `Your team is not qualified for Round ${roundNumber}. Only shortlisted teams may participate.`,
        );
      }
    }

    if (progress.eligibilityStatus !== 'ELIGIBLE') {
      throw new ForbiddenException(
        `Your team is not qualified for Round ${roundNumber}. Only shortlisted teams may participate.`,
      );
    }

    return progress;
  }

  /**
   * Helper to verify if competition round is currently accessible to contestant
   */
  async assertRoundAccess(
    teamUser: AuthTeamUser,
    roundNumber: number,
    action: 'READ' | 'WRITE' | 'SUBMIT',
  ) {
    const round = await this.getRound(roundNumber);
    const progress = await this.getOrCreateTeamProgress(teamUser.id, round.id, roundNumber);

    const state = await this.prisma.competitionState.findUnique({
      where: { id: 'global' },
    });

    const isRoundCurrent = state?.currentRoundNumber === roundNumber;
    const isRoundActive =
      round.status === 'ACTIVE' ||
      (isRoundCurrent && state?.status === (`ROUND_${roundNumber}_ACTIVE` as any));

    // CHANGE 6: Enforce workspace lock before round start on backend
    if (action === 'READ') {
      const isConcludedOrSubmitted =
        round.status === 'COMPLETED' ||
        progress.participationStatus === 'SUBMITTED';

      if (!isRoundActive && !isConcludedOrSubmitted) {
        throw new ForbiddenException(
          `The competition arena will become available when Round ${roundNumber} begins.`,
        );
      }
    }

    // If writing or submitting, enforce strict timing & state boundaries
    if (action === 'WRITE' || action === 'SUBMIT') {
      if (state?.isPaused) {
        throw new BadRequestException('Competition is currently paused by the administrator.');
      }

      if (!isRoundActive) {
        throw new BadRequestException(`Round ${roundNumber} is not currently active.`);
      }

      if (
        isRoundCurrent &&
        state?.remainingDurationSeconds !== null &&
        state?.remainingDurationSeconds !== undefined &&
        state.remainingDurationSeconds <= 0
      ) {
        throw new BadRequestException(`Round ${roundNumber} deadline has expired.`);
      }

      if (roundNumber === 1 || roundNumber === 2) {
        if (progress.participationStatus === 'SUBMITTED') {
          throw new BadRequestException(`Round ${roundNumber} has already been submitted by your team.`);
        }
      }
    }

    let remainingSeconds = round.durationMinutes * 60;
    if (isRoundCurrent && state?.deadlineAt && !state.isPaused) {
      const now = new Date();
      remainingSeconds = Math.max(0, Math.floor((state.deadlineAt.getTime() - now.getTime()) / 1000));
    } else if (isRoundCurrent && state?.remainingDurationSeconds !== null && state?.remainingDurationSeconds !== undefined) {
      remainingSeconds = state.remainingDurationSeconds;
    }

    return {
      round,
      progress,
      state,
      isRoundActive,
      isPaused: Boolean(state?.isPaused),
      remainingSeconds,
      durationMinutes: round.durationMinutes,
      deadlineAt: state?.deadlineAt ? state.deadlineAt.toISOString() : null,
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
    const { round, progress, state } = await this.assertRoundAccess(teamUser, 1, 'READ');

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

    let remainingSeconds = round.durationMinutes * 60;
    if (state?.currentRoundNumber === 1 && state.deadlineAt && !state.isPaused) {
      const now = new Date();
      remainingSeconds = Math.max(0, Math.floor((state.deadlineAt.getTime() - now.getTime()) / 1000));
    } else if (state?.currentRoundNumber === 1 && state.remainingDurationSeconds !== null && state?.remainingDurationSeconds !== undefined) {
      remainingSeconds = state.remainingDurationSeconds;
    }

    return {
      roundNumber: 1,
      durationMinutes: round.durationMinutes,
      remainingSeconds,
      deadlineAt: state?.deadlineAt ? state.deadlineAt.toISOString() : null,
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
    const { round, progress } = await this.assertRoundAccess(teamUser, 1, 'WRITE');

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
    const { round, progress } = await this.assertRoundAccess(teamUser, 1, 'SUBMIT');

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
  // Strict case draft isolation (Case 1, 2, 3) and independent submission state
  // ============================================================================

  /**
   * Get draft for a team in a specific round and case number
   */
  async getWorkspaceDraft(teamUser: AuthTeamUser, roundNumber: number, caseNumber = 1) {
    const { round, progress, isRoundActive, isPaused, remainingSeconds } =
      await this.assertRoundAccess(teamUser, roundNumber, 'READ');

    const draft = await this.prisma.workspaceDraft.findUnique({
      where: {
        teamId_roundId_caseNumber: {
          teamId: teamUser.id,
          roundId: round.id,
          caseNumber,
        },
      },
    });

    // Default starter code from question if draft does not exist
    const question = await this.prisma.question.findFirst({
      where: {
        roundId: round.id,
        caseNumber: roundNumber === 3 ? caseNumber : null,
      },
      orderBy: { orderNumber: 'asc' },
    });

    let isCaseSubmitted = false;
    let submissionId: string | null = null;
    let submittedAt: string | null = null;

    if (roundNumber === 2) {
      if (progress.participationStatus === 'SUBMITTED') {
        isCaseSubmitted = true;
        submittedAt = progress.submittedAt ? progress.submittedAt.toISOString() : null;
        const sub = await this.prisma.submission.findFirst({
          where: { teamId: teamUser.id, roundId: round.id, isTestRun: false },
          orderBy: { submittedAt: 'desc' },
        });
        submissionId = sub?.id || null;
      }
    } else if (roundNumber === 3 && question) {
      const sub = await this.prisma.submission.findFirst({
        where: {
          teamId: teamUser.id,
          roundId: round.id,
          questionId: question.id,
          isTestRun: false,
        },
        orderBy: { submittedAt: 'desc' },
      });
      if (sub) {
        isCaseSubmitted = true;
        submissionId = sub.id;
        submittedAt = sub.submittedAt.toISOString();
      }
    }

    const submittedCaseNumbers: number[] = [];
    if (roundNumber === 3) {
      const round3Questions = await this.prisma.question.findMany({
        where: { roundId: round.id, isActive: true },
      });
      const qIds = round3Questions.map((q) => q.id);
      const subs = await this.prisma.submission.findMany({
        where: {
          teamId: teamUser.id,
          roundId: round.id,
          questionId: { in: qIds },
          isTestRun: false,
        },
        select: { questionId: true },
      });
      const submittedQSet = new Set(subs.map((s) => s.questionId));
      for (const q of round3Questions) {
        if (q.caseNumber && submittedQSet.has(q.id)) {
          submittedCaseNumbers.push(q.caseNumber);
        }
      }
    }

    return {
      sourceCode:
        draft?.sourceCode ?? (question?.starterCode || '// Write your solution here\n'),
      language: draft?.language ?? (question?.language || 'typescript'),
      version: draft?.version ?? 0,
      updatedAt: draft?.updatedAt ? draft.updatedAt.toISOString() : new Date().toISOString(),
      isSubmitted: roundNumber === 2 ? progress.participationStatus === 'SUBMITTED' : isCaseSubmitted,
      submissionId,
      submittedAt,
      submittedCases: submittedCaseNumbers,
      isRoundActive,
      isPaused,
      remainingSeconds,
      participationStatus: progress.participationStatus,
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
    const { round, progress } = await this.assertRoundAccess(teamUser, roundNumber, 'WRITE');

    if (roundNumber === 2 && progress.participationStatus === 'SUBMITTED') {
      throw new BadRequestException('Round 2 has already been submitted by your team.');
    }

    if (roundNumber === 3) {
      const question = await this.prisma.question.findFirst({
        where: { roundId: round.id, caseNumber },
      });
      if (question) {
        const existingSub = await this.prisma.submission.findFirst({
          where: { teamId: teamUser.id, roundId: round.id, questionId: question.id, isTestRun: false },
        });
        if (existingSub) {
          throw new BadRequestException(`Case ${caseNumber} has already been submitted and cannot be modified.`);
        }
      }
    }

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
    const { round, progress } = await this.assertRoundAccess(teamUser, roundNumber, 'SUBMIT');

    // Resolve question
    const question = await this.prisma.question.findFirst({
      where: {
        roundId: round.id,
        caseNumber: roundNumber === 3 ? caseNumber : null,
      },
      orderBy: { orderNumber: 'asc' },
    });

    // Check if already submitted
    if (roundNumber === 2) {
      if (progress.participationStatus === 'SUBMITTED') {
        throw new BadRequestException('Round 2 has already been submitted by your team.');
      }
    } else if (roundNumber === 3 && question) {
      const existingSub = await this.prisma.submission.findFirst({
        where: { teamId: teamUser.id, roundId: round.id, questionId: question.id, isTestRun: false },
      });
      if (existingSub) {
        throw new BadRequestException(`Case ${caseNumber} has already been submitted by your team.`);
      }
    }

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
    if (roundNumber === 2) {
      await this.prisma.teamRoundProgress.update({
        where: { id: progress.id },
        data: {
          participationStatus: 'SUBMITTED',
          submittedAt: new Date(),
        },
      });
    } else if (roundNumber === 3) {
      const r3Questions = await this.prisma.question.findMany({
        where: { roundId: round.id, isActive: true },
      });
      const totalCases = r3Questions.length || 3;
      const allSubs = await this.prisma.submission.findMany({
        where: { teamId: teamUser.id, roundId: round.id, isTestRun: false },
        select: { questionId: true },
      });
      const submittedQSet = new Set(allSubs.map((s) => s.questionId));
      const submittedCases: number[] = [];
      for (const q of r3Questions) {
        if (q.caseNumber && submittedQSet.has(q.id)) {
          submittedCases.push(q.caseNumber);
        }
      }
      const isAllCasesSubmitted = submittedCases.length >= totalCases;
      const currentBreakdown = (progress.scoreBreakdown as any) || {};

      await this.prisma.teamRoundProgress.update({
        where: { id: progress.id },
        data: {
          participationStatus: isAllCasesSubmitted ? 'SUBMITTED' : 'IN_PROGRESS',
          submittedAt: isAllCasesSubmitted ? new Date() : (progress.submittedAt || null),
          scoreBreakdown: {
            ...currentBreakdown,
            submittedCases,
          },
        },
      });
    }

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
