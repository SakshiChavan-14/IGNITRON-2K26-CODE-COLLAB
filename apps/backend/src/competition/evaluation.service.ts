import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  AdminSubmissionListItem,
  AdminSubmissionDetailDto,
  GradeSubmissionDto,
  SubmissionStatus,
} from '@ignitron/shared';

@Injectable()
export class EvaluationService {
  private readonly logger = new Logger(EvaluationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List submissions for admin inspection
   */
  async listSubmissions(filter: {
    roundNumber?: number;
    teamId?: string;
    status?: SubmissionStatus;
  }): Promise<AdminSubmissionListItem[]> {
    const where: any = {
      isTestRun: false,
    };

    if (filter.teamId) {
      where.teamId = filter.teamId;
    }

    if (filter.status) {
      where.submissionStatus = filter.status;
    }

    if (filter.roundNumber) {
      const round = await this.prisma.competitionRound.findFirst({
        where: { roundNumber: filter.roundNumber },
      });
      if (round) {
        where.roundId = round.id;
      }
    }

    const submissions = await this.prisma.submission.findMany({
      where,
      include: {
        team: {
          select: {
            id: true,
            teamName: true,
            teamCode: true,
            institution: true,
          },
        },
        round: {
          select: {
            roundNumber: true,
          },
        },
        question: {
          select: {
            id: true,
            title: true,
            caseNumber: true,
          },
        },
        evaluations: {
          include: {
            evaluator: {
              select: { fullName: true },
            },
          },
          orderBy: { evaluatedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    return submissions.map((s) => {
      const latestEval = s.evaluations[0];
      return {
        id: s.id,
        teamId: s.teamId,
        teamName: s.team.teamName,
        teamCode: s.team.teamCode,
        institution: s.team.institution,
        roundNumber: s.round?.roundNumber || 0,
        questionId: s.questionId,
        questionTitle: s.question?.title || null,
        caseNumber: s.question?.caseNumber || null,
        language: s.language,
        submissionStatus: s.submissionStatus as SubmissionStatus,
        score: s.score !== null ? Number(s.score) : null,
        submittedAt: s.submittedAt.toISOString(),
        evaluatedAt: s.evaluatedAt ? s.evaluatedAt.toISOString() : null,
        evaluatorName: latestEval?.evaluator?.fullName || null,
      };
    });
  }

  /**
   * Get submission detail for evaluation
   */
  async getSubmissionDetail(id: string): Promise<AdminSubmissionDetailDto> {
    const s = await this.prisma.submission.findUnique({
      where: { id },
      include: {
        team: {
          select: {
            id: true,
            teamName: true,
            teamCode: true,
            institution: true,
          },
        },
        round: {
          select: { roundNumber: true },
        },
        question: {
          select: {
            id: true,
            title: true,
            description: true,
            starterCode: true,
            caseNumber: true,
            rubric: true,
          },
        },
        evaluations: {
          include: {
            evaluator: { select: { fullName: true } },
          },
          orderBy: { evaluatedAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!s) {
      throw new NotFoundException(`Submission with ID ${id} not found.`);
    }

    const latestEval = s.evaluations[0];

    return {
      id: s.id,
      teamId: s.teamId,
      teamName: s.team.teamName,
      teamCode: s.team.teamCode,
      institution: s.team.institution,
      roundNumber: s.round?.roundNumber || 0,
      questionId: s.questionId,
      questionTitle: s.question?.title || null,
      questionDescription: s.question?.description || null,
      starterCode: s.question?.starterCode || null,
      caseNumber: s.question?.caseNumber || null,
      language: s.language,
      sourceCode: s.sourceCode,
      stdout: s.stdout,
      stderr: s.stderr,
      compileOutput: s.compileOutput,
      submissionStatus: s.submissionStatus as SubmissionStatus,
      score: s.score !== null ? Number(s.score) : null,
      testCaseResults: s.testCaseResults,
      criteriaScores: (latestEval?.criteriaScores as Record<string, number>) || null,
      feedback: latestEval?.feedback || null,
      submittedAt: s.submittedAt.toISOString(),
      evaluatedAt: s.evaluatedAt ? s.evaluatedAt.toISOString() : null,
      evaluatorName: latestEval?.evaluator?.fullName || null,
    };
  }

  /**
   * Grade a submission with rubric scores and feedback
   */
  async gradeSubmission(submissionId: string, evaluatorId: string, dto: GradeSubmissionDto) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        round: true,
        team: true,
        question: true,
      },
    });

    if (!submission) {
      throw new NotFoundException(`Submission with ID ${submissionId} not found.`);
    }

    const now = new Date();

    // 1. Update Submission record
    await this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        score: dto.totalScore,
        submissionStatus: 'EVALUATED',
        evaluatedAt: now,
      },
    });

    // 2. Create Evaluation record
    await this.prisma.evaluation.create({
      data: {
        submissionId,
        evaluatorId,
        teamId: submission.teamId,
        roundNumber: submission.round?.roundNumber,
        totalScore: dto.totalScore,
        criteriaScores: dto.criteriaScores ? (dto.criteriaScores as any) : null,
        feedback: dto.feedback || null,
        evaluatedAt: now,
      },
    });

    // 3. Update TeamRoundProgress
    if (submission.roundId) {
      const progress = await this.prisma.teamRoundProgress.findUnique({
        where: {
          teamId_roundId: {
            teamId: submission.teamId,
            roundId: submission.roundId,
          },
        },
      });

      if (progress) {
        let finalRoundScore = dto.totalScore;

        // If Round 3, sum the highest score for each case
        if (submission.round?.roundNumber === 3) {
          const allR3Submissions = await this.prisma.submission.findMany({
            where: {
              teamId: submission.teamId,
              roundId: submission.roundId,
              submissionStatus: 'EVALUATED',
              score: { not: null },
            },
            include: { question: true },
          });

          // Group by caseNumber, take max score per case
          const caseScores = new Map<number, number>();
          for (const sub of allR3Submissions) {
            const cNum = sub.question?.caseNumber || 1;
            const currentMax = caseScores.get(cNum) || 0;
            const subScore = Number(sub.score || 0);
            if (subScore > currentMax) {
              caseScores.set(cNum, subScore);
            }
          }

          finalRoundScore = Array.from(caseScores.values()).reduce((a, b) => a + b, 0);
          if (dto.criteriaScores?.codeQuality) {
            finalRoundScore += dto.criteriaScores.codeQuality;
          }
          finalRoundScore = Math.min(100, finalRoundScore);
        }

        await this.prisma.teamRoundProgress.update({
          where: { id: progress.id },
          data: {
            score: finalRoundScore,
            evaluatedAt: now,
            scoreBreakdown: dto.criteriaScores ? (dto.criteriaScores as any) : undefined,
          },
        });
      }
    }

    // 4. Activity Log
    await this.prisma.activityLog.create({
      data: {
        actorType: 'ADMIN',
        actorId: evaluatorId,
        action: 'GRADE_SUBMISSION',
        description: `Graded submission for team "${submission.team.teamName}" in Round ${
          submission.round?.roundNumber
        }. Score: ${dto.totalScore}.`,
        metadata: {
          submissionId,
          teamId: submission.teamId,
          totalScore: dto.totalScore,
          criteriaScores: dto.criteriaScores,
        },
      },
    });

    return {
      success: true,
      message: `Submission graded successfully with score ${dto.totalScore}.`,
      submissionId,
      score: dto.totalScore,
    };
  }

  /**
   * Admin inspection of a team's Round 1 MCQ answers
   */
  async getTeamMcqReview(teamId: string) {
    const round = await this.prisma.competitionRound.findFirst({
      where: { roundNumber: 1 },
    });
    if (!round) {
      throw new NotFoundException('Round 1 not found.');
    }

    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, teamName: true, teamCode: true, institution: true },
    });
    if (!team) {
      throw new NotFoundException(`Team ${teamId} not found.`);
    }

    const progress = await this.prisma.teamRoundProgress.findUnique({
      where: { teamId_roundId: { teamId, roundId: round.id } },
    });

    const questions = await this.prisma.question.findMany({
      where: { roundId: round.id, isActive: true },
      orderBy: { orderNumber: 'asc' },
    });

    const teamAnswers = await this.prisma.teamMcqAnswer.findMany({
      where: { teamId },
    });

    const answersMap = new Map<string, { selectedOption: number | null; isFlagged: boolean }>();
    for (const a of teamAnswers) {
      answersMap.set(a.questionId, { selectedOption: a.selectedOption, isFlagged: a.isFlagged });
    }

    const reviewQuestions = questions.map((q) => {
      const userAns = answersMap.get(q.id);
      const isCorrect =
        userAns?.selectedOption !== null &&
        userAns?.selectedOption !== undefined &&
        userAns.selectedOption === q.correctOption;

      return {
        questionId: q.id,
        orderNumber: q.orderNumber,
        title: q.title,
        description: q.description,
        options: q.options as string[],
        correctOption: q.correctOption,
        explanation: q.explanation,
        marks: Number(q.marks),
        selectedOption: userAns ? userAns.selectedOption : null,
        isFlagged: userAns ? userAns.isFlagged : false,
        isCorrect,
      };
    });

    return {
      team,
      roundNumber: 1,
      score: progress ? Number(progress.score) : 0,
      participationStatus: progress?.participationStatus || 'NOT_STARTED',
      submittedAt: progress?.submittedAt ? progress.submittedAt.toISOString() : null,
      totalQuestions: questions.length,
      correctCount: reviewQuestions.filter((q) => q.isCorrect).length,
      questions: reviewQuestions,
    };
  }
}
