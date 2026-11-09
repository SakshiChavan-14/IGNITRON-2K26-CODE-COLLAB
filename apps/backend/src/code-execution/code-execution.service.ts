import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Judge0ClientService } from './judge0-client.service';
import { ExecuteCodeDto } from './dto/execute-code.dto';
import {
  OFFICIAL_JUDGE0_LANGUAGES,
  CodeExecutionResultDto,
  SupportedLanguageItem,
  AuthTeamUser,
  EXECUTION_LIMITS,
} from '@ignitron/shared';

@Injectable()
export class CodeExecutionService {
  private readonly logger = new Logger(CodeExecutionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly judge0Client: Judge0ClientService,
  ) {}

  /**
   * Return supported languages with official Judge0 IDs
   */
  async getSupportedLanguages(): Promise<SupportedLanguageItem[]> {
    return this.judge0Client.getSupportedLanguages();
  }

  /**
   * Health check for Judge0 service
   */
  async checkHealth() {
    return this.judge0Client.getHealth();
  }

  /**
   * Execute code for authenticated team with session & competition rules validation
   */
  async executeCode(
    dto: ExecuteCodeDto,
    teamUser: AuthTeamUser,
    isDevOverride: boolean = false,
  ): Promise<CodeExecutionResultDto> {
    // 1. Resolve & Validate Language
    const languageConfig = this.resolveLanguage(dto);
    if (!languageConfig) {
      throw new BadRequestException(
        `Invalid or unsupported programming language. Supported languages: ${OFFICIAL_JUDGE0_LANGUAGES.map((l) => `${l.name} (${l.key})`).join(', ')}`,
      );
    }

    // 2. Validate Code & Stdin Size
    if (Buffer.byteLength(dto.sourceCode, 'utf8') > EXECUTION_LIMITS.MAX_SOURCE_CODE_SIZE_BYTES) {
      throw new BadRequestException(
        `Source code exceeds maximum allowed size of ${EXECUTION_LIMITS.MAX_SOURCE_CODE_SIZE_BYTES / 1024} KB`,
      );
    }

    if (
      dto.stdin &&
      Buffer.byteLength(dto.stdin, 'utf8') > EXECUTION_LIMITS.MAX_STDIN_SIZE_BYTES
    ) {
      throw new BadRequestException(
        `Standard input exceeds maximum allowed size of ${EXECUTION_LIMITS.MAX_STDIN_SIZE_BYTES / 1024} KB`,
      );
    }

    // 3. Verify Active Participant Session Mutex
    await this.verifyActiveParticipantSession(teamUser);

    // 4. Verify Competition State, Deadline & Team Eligibility
    const competitionState = await this.prisma.competitionState.findUnique({
      where: { id: 'global' },
    });

    let activeRoundId: string | null = null;
    const isDevelopmentMode = process.env.NODE_ENV !== 'production';

    if (!isDevOverride && !(isDevelopmentMode && dto.isTestRun)) {
      if (!competitionState) {
        throw new ForbiddenException('Competition state has not been initialized.');
      }

      // Check if competition is in an active round
      const activeStates = ['ROUND_1_ACTIVE', 'ROUND_2_ACTIVE', 'ROUND_3_ACTIVE'];
      if (!activeStates.includes(competitionState.status)) {
        throw new ForbiddenException(
          `Code execution is blocked: competition is currently in state "${competitionState.status}".`,
        );
      }

      // Check if round is paused
      if (competitionState.isPaused) {
        throw new ForbiddenException('Competition is currently paused by administrators.');
      }

      // Check round deadline
      const now = new Date();
      if (competitionState.deadlineAt && competitionState.deadlineAt.getTime() < now.getTime()) {
        throw new ForbiddenException(
          'Round deadline has expired. Code execution is no longer accepted for this round.',
        );
      }

      // Check team eligibility in active round
      if (competitionState.currentRoundNumber) {
        const round = await this.prisma.competitionRound.findUnique({
          where: { roundNumber: competitionState.currentRoundNumber },
        });

        if (round) {
          activeRoundId = round.id;
          const progress = await this.prisma.teamRoundProgress.findUnique({
            where: {
              teamId_roundId: {
                teamId: teamUser.id,
                roundId: round.id,
              },
            },
          });

          // In Round 1, active teams are automatically eligible if not yet seeded
          const isEligible =
            progress?.eligibilityStatus === 'ELIGIBLE' ||
            (competitionState.currentRoundNumber === 1 && progress === null);

          if (!isEligible) {
            throw new ForbiddenException(
              `Team "${teamUser.teamCode}" is not eligible to participate in Round ${competitionState.currentRoundNumber}.`,
            );
          }
        }
      }
    }

    // 5. Submit to Judge0 CE
    const result = await this.judge0Client.execute(
      dto.sourceCode,
      languageConfig.id,
      dto.stdin || '',
      EXECUTION_LIMITS.DEFAULT_CPU_TIME_LIMIT_SECONDS,
      EXECUTION_LIMITS.DEFAULT_MEMORY_LIMIT_KB,
    );

    const normalizedStatus = this.judge0Client.normalizeStatus(result.status);
    const executionTimeSeconds = result.time ? parseFloat(result.time) : null;
    const memoryUsageKb = result.memory ? Number(result.memory) : null;
    const isTestRun = dto.isTestRun ?? true;

    // 6. Record Submission in MySQL
    const submission = await this.prisma.submission.create({
      data: {
        teamId: teamUser.id,
        roundId: activeRoundId,
        language: languageConfig.key,
        sourceCode: dto.sourceCode,
        stdin: dto.stdin || null,
        stdout: result.stdout || null,
        stderr: result.stderr || null,
        compileOutput: result.compile_output || null,
        executionTime: executionTimeSeconds ? String(executionTimeSeconds) : null,
        memoryUsage: memoryUsageKb,
        submissionStatus: normalizedStatus.isSuccess
          ? 'ACCEPTED'
          : normalizedStatus.isCompilationError
            ? 'COMPILATION_ERROR'
            : normalizedStatus.isTimeLimitExceeded
              ? 'TIME_LIMIT_EXCEEDED'
              : 'RUNTIME_ERROR',
        judge0Token: result.token || null,
        isTestRun,
      },
    });

    return {
      submissionId: submission.id,
      token: result.token,
      status: normalizedStatus,
      stdout: result.stdout,
      stderr: result.stderr,
      compileOutput: result.compile_output,
      executionTimeSeconds,
      memoryUsageKb,
      isTestRun,
      executedAt: submission.createdAt.toISOString(),
    };
  }

  /**
   * Retrieve execution result, verifying team ownership
   */
  async getSubmissionResult(
    submissionId: string,
    requestingTeamId?: string,
    isAdmin: boolean = false,
  ): Promise<CodeExecutionResultDto> {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: { team: true },
    });

    if (!submission) {
      throw new NotFoundException(`Submission with ID "${submissionId}" not found.`);
    }

    if (!isAdmin && requestingTeamId && submission.teamId !== requestingTeamId) {
      throw new ForbiddenException('Access denied: You cannot view another team’s execution output.');
    }

    const isSuccess = submission.submissionStatus === 'ACCEPTED';
    const isCompilationError = submission.submissionStatus === 'COMPILATION_ERROR';
    const isTimeLimitExceeded = submission.submissionStatus === 'TIME_LIMIT_EXCEEDED';
    const isRuntimeError = submission.submissionStatus === 'RUNTIME_ERROR';

    return {
      submissionId: submission.id,
      token: submission.judge0Token || undefined,
      status: {
        id: isSuccess ? 3 : isCompilationError ? 6 : isTimeLimitExceeded ? 5 : 11,
        description: submission.submissionStatus,
        isSuccess,
        isCompilationError,
        isRuntimeError,
        isTimeLimitExceeded,
        isMemoryLimitExceeded: false,
      },
      stdout: submission.stdout,
      stderr: submission.stderr,
      compileOutput: submission.compileOutput,
      executionTimeSeconds: submission.executionTime ? Number(submission.executionTime) : null,
      memoryUsageKb: submission.memoryUsage,
      isTestRun: submission.isTestRun,
      executedAt: submission.createdAt.toISOString(),
    };
  }

  /**
   * Strictly verify that the calling participant has the active session for the team
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
        'Participant does not hold the active team terminal session. Please authenticate or request relay handover.',
      );
    }
  }

  /**
   * Helper to resolve language by key or ID
   */
  private resolveLanguage(dto: ExecuteCodeDto): SupportedLanguageItem | undefined {
    if (dto.languageId) {
      return OFFICIAL_JUDGE0_LANGUAGES.find((l) => l.id === dto.languageId);
    }
    if (dto.languageKey) {
      return OFFICIAL_JUDGE0_LANGUAGES.find((l) => l.key === dto.languageKey);
    }
    return undefined;
  }
}

