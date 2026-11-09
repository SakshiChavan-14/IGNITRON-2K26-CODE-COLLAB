/**
 * IGNITRON 2K26 — CODE RELAY
 * Shared Definitions & Types
 */

export const APPLICATION_METADATA = {
  name: 'IGNITRON 2K26',
  subtitle: 'CODE RELAY',
  version: '1.0.0-phase04',
  author: 'IGNITRON Technical Committee',
} as const;

export const SESSION_CONFIG = {
  COOKIE_NAME: 'ignitron_session',
  HEARTBEAT_INTERVAL_MS: 30000, // 30 seconds
  SESSION_TIMEOUT_MINUTES: 15,
  MAX_PASSWORD_LENGTH: 128,
  MIN_PASSWORD_LENGTH: 8,
} as const;

export const OFFICIAL_ROUNDS_CONFIG = [
  {
    roundNumber: 1,
    name: 'MCQ Arena',
    description:
      'Fast-paced algorithmic multiple-choice questions assessing core computer science, discrete math, and runtime complexity fundamentals.',
    durationMinutes: 30,
    maximumMarks: 30,
  },
  {
    roundNumber: 2,
    name: 'Bug Hunt Arena',
    description:
      'Code debugging and error isolation challenges across flawed real-world multi-language codebases.',
    durationMinutes: 40,
    maximumMarks: 100,
  },
  {
    roundNumber: 3,
    name: 'Final Boss Coding',
    description:
      'Complex multi-stage team code relay programming challenge against timed rigorous test suites.',
    durationMinutes: 60,
    maximumMarks: 100,
  },
] as const;

// ------------------------------------------------------------------------------
// COMMON API TYPES
// ------------------------------------------------------------------------------

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  application: string;
  service: string;
  timestamp: string;
  uptimeSeconds?: number;
  environment?: string;
}

export interface ReadinessResponse {
  status: 'ready' | 'not_ready';
  application: string;
  service: string;
  timestamp: string;
  checks: {
    api: 'ok' | 'error';
    database: 'pending_phase_02' | 'connected' | 'disconnected';
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    statusCode: number;
    message: string;
    timestamp: string;
    path: string;
  };
}

// ------------------------------------------------------------------------------
// ENUMS & CONSTANTS
// ------------------------------------------------------------------------------

export type AdminRole = 'SUPER_ADMIN' | 'ORGANIZER' | 'JUDGE';

export type TeamStatus = 'ACTIVE' | 'DISQUALIFIED' | 'WITHDRAWN';

export type RoundStatus = 'UPCOMING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';

export type EligibilityStatus = 'PENDING' | 'ELIGIBLE' | 'INELIGIBLE';

export type ParticipationStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'DISQUALIFIED'
  | 'TIMED_OUT';

export type SubmissionStatus =
  | 'PENDING'
  | 'EVALUATING'
  | 'ACCEPTED'
  | 'WRONG_ANSWER'
  | 'TIME_LIMIT_EXCEEDED'
  | 'COMPILATION_ERROR'
  | 'RUNTIME_ERROR'
  | 'EVALUATED';

export type ActorType = 'SYSTEM' | 'ADMIN' | 'TEAM';

export type SessionStatus = 'ACTIVE' | 'ENDED' | 'EXPIRED' | 'REVOKED';

export type SessionTerminationReason =
  | 'USER_LOGOUT'
  | 'TIMEOUT'
  | 'ADMIN_REVOKED'
  | 'DISPLACED';

export type CompetitionStatus =
  | 'STANDBY'
  | 'ROUND_1_ACTIVE'
  | 'ROUND_1_EVALUATION'
  | 'ROUND_2_ACTIVE'
  | 'ROUND_2_EVALUATION'
  | 'ROUND_3_ACTIVE'
  | 'FINAL_EVALUATION'
  | 'COMPLETED';

// ------------------------------------------------------------------------------
// AUTHENTICATION & SESSIONS
// ------------------------------------------------------------------------------

export interface AdminJwtPayload {
  sub: string;
  email: string;
  fullName: string;
  role: AdminRole;
  type: 'ADMIN';
  iat?: number;
  exp?: number;
}

export interface TeamJwtPayload {
  sub: string; // Team ID
  teamCode: string;
  teamName: string;
  participantId: string;
  participantName: string;
  sessionId: string;
  type: 'TEAM';
  iat?: number;
  exp?: number;
}

export type JwtPayload = AdminJwtPayload | TeamJwtPayload;

export interface AuthAdminUser {
  id: string;
  type: 'ADMIN';
  email: string;
  fullName: string;
  role: AdminRole;
}

export interface AuthTeamUser {
  id: string;
  type: 'TEAM';
  teamCode: string;
  teamName: string;
  institution?: string | null;
  mustChangePassword: boolean;
  activeParticipant: {
    id: string;
    fullName: string;
    email: string;
    studentId?: string | null;
  };
  sessionId: string;
}

export type AuthUser = AuthAdminUser | AuthTeamUser;

export interface AdminLoginDto {
  email: string;
  password: string;
}

export interface TeamLoginDto {
  teamCode: string;
  password: string;
  participantId: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface TeamParticipantOption {
  id: string;
  fullName: string;
  email: string;
  studentId?: string | null;
}

export interface TeamLookupResponse {
  teamId: string;
  teamCode: string;
  teamName: string;
  participants: TeamParticipantOption[];
}

export interface TeamSessionInfo {
  id: string;
  teamId: string;
  participantId: string;
  participantName: string;
  status: SessionStatus;
  loginAt: string;
  lastActivityAt: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

// ------------------------------------------------------------------------------
// ADMIN & TEAM MANAGEMENT
// ------------------------------------------------------------------------------

export interface CreateParticipantInput {
  fullName: string;
  email: string;
  phone?: string;
  studentId?: string;
}

export interface CreateTeamDto {
  teamCode?: string; // Optional: auto-generated if omitted
  teamName: string;
  institution?: string;
  participants: [CreateParticipantInput, CreateParticipantInput];
}

export interface UpdateTeamDto {
  teamName?: string;
  institution?: string;
  isActive?: boolean;
  status?: TeamStatus;
  participants?: Array<{
    id?: string;
    fullName: string;
    email: string;
    phone?: string;
    studentId?: string;
  }>;
}

export interface ParticipantSummary {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  studentId?: string | null;
  isActive: boolean;
}

export interface TeamListItem {
  id: string;
  teamCode: string;
  teamName: string;
  institution?: string | null;
  isActive: boolean;
  isDemo?: boolean;
  status: TeamStatus;
  mustChangePassword: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  participants: ParticipantSummary[];
  activeSession?: {
    id: string;
    participantId: string;
    participantName: string;
    loginAt: string;
    lastActivityAt: string;
  } | null;
}

export interface TeamCredentials {
  teamId: string;
  teamCode: string;
  teamName: string;
  temporaryPassword: string;
  generatedAt: string;
}

export interface DashboardStatsDto {
  totalTeams: number;
  activeTeams: number;
  inactiveTeams: number;
  totalParticipants: number;
  teamsWithActiveSessions: number;
  currentCompetitionStatus: CompetitionStatus;
  currentRoundNumber: number | null;
}

// ------------------------------------------------------------------------------
// CSV BULK IMPORT
// ------------------------------------------------------------------------------

export interface CsvColumnMapping {
  teamNameColumn: string;
  teamCodeColumn?: string;
  institutionColumn?: string;
  p1NameColumn: string;
  p1EmailColumn: string;
  p1PhoneColumn?: string;
  p1StudentIdColumn?: string;
  p2NameColumn: string;
  p2EmailColumn: string;
  p2PhoneColumn?: string;
  p2StudentIdColumn?: string;
}

export interface CsvRowValidation {
  rowIndex: number;
  rawRow: Record<string, string>;
  isValid: boolean;
  errors: string[];
  mappedData?: {
    teamCode: string;
    teamName: string;
    institution?: string;
    participant1: CreateParticipantInput;
    participant2: CreateParticipantInput;
  };
}

export interface CsvImportPreviewResponse {
  totalRows: number;
  validCount: number;
  invalidCount: number;
  duplicateCodesCount: number;
  duplicateEmailsCount: number;
  rows: CsvRowValidation[];
  headers: string[];
}

export interface CsvImportConfirmPayload {
  validRows: Array<{
    teamCode: string;
    teamName: string;
    institution?: string;
    participant1: CreateParticipantInput;
    participant2: CreateParticipantInput;
  }>;
}

export interface CsvImportConfirmResult {
  importedCount: number;
  generatedCredentials: TeamCredentials[];
  activityLogId: string;
}

// ------------------------------------------------------------------------------
// PHASE 04: GLOBAL COMPETITION CONTROL ENGINE & STATE MACHINE
// ------------------------------------------------------------------------------

export interface CompetitionStateDto {
  id: string;
  status: CompetitionStatus;
  currentRoundNumber: number | null;
  currentRoundName: string | null;
  isPaused: boolean;
  startedAt: string | null;
  deadlineAt: string | null;
  pausedAt: string | null;
  remainingDurationSeconds: number | null;
  totalDurationSeconds: number | null;
  serverTime: string;
  totalTeamsCount: number;
  eligibleTeamsCount: number;
  participatingTeamsCount: number;
  completedTeamsCount: number;
  validTransitions: string[];
}

export type RoundControlAction =
  | 'START_ROUND_1'
  | 'PAUSE_ROUND'
  | 'RESUME_ROUND'
  | 'END_ROUND'
  | 'ENTER_EVALUATION'
  | 'COMPLETE_EVALUATION'
  | 'START_ROUND_2'
  | 'START_ROUND_3'
  | 'COMPLETE_COMPETITION'
  | 'RESET_COMPETITION';

export interface RoundControlDto {
  action: RoundControlAction;
  notes?: string;
  resetType?: 'DEMO_ONLY' | 'FULL_RESET';
}

export interface ShortlistingTeamItem {
  teamId: string;
  teamCode: string;
  teamName: string;
  institution: string | null;
  isDemo: boolean;
  participants: Array<{ fullName: string; email: string }>;
  currentRoundEligibility: EligibilityStatus;
  nextRoundEligibility: EligibilityStatus;
  participationStatus: ParticipationStatus;
  score: number;
  rank?: number;
}

export interface ShortlistSubmissionDto {
  roundNumber: number; // e.g. 1 (qualifying for Round 2) or 2 (qualifying for Round 3)
  qualifiedTeamIds: string[];
  notes?: string;
}

export interface ShortlistSubmissionResult {
  roundNumber: number;
  totalProcessed: number;
  qualifiedCount: number;
  disqualifiedCount: number;
  activityLogId: string;
}

export interface TeamRoundHistoryItem {
  roundNumber: number;
  roundName: string;
  eligibilityStatus: EligibilityStatus;
  participationStatus: ParticipationStatus;
  score: number;
  startedAt: string | null;
  submittedAt: string | null;
  evaluatedAt: string | null;
}

export interface TeamCompetitionStatusDto {
  teamId: string;
  teamCode: string;
  teamName: string;
  competitionStatus: CompetitionStatus;
  currentRound: {
    roundNumber: number;
    name: string;
    description: string;
    durationMinutes: number;
    maximumMarks: number;
  } | null;
  eligibilityStatus: EligibilityStatus;
  participationStatus: ParticipationStatus;
  isEligible: boolean;
  deadlineAt: string | null;
  serverTime: string;
  isPaused: boolean;
  remainingDurationSeconds: number | null;
  roundHistory: TeamRoundHistoryItem[];
}

export interface CompetitionActivityLogItem {
  id: string;
  actorType: ActorType;
  actorId: string | null;
  action: string;
  description: string;
  metadata?: any;
  createdAt: string;
}

// ------------------------------------------------------------------------------
// PHASE 05A: JUDGE0 CE & SECURE CODE EXECUTION
// ------------------------------------------------------------------------------

export const EXECUTION_LIMITS = {
  MAX_SOURCE_CODE_SIZE_BYTES: 64 * 1024, // 64 KB
  MAX_STDIN_SIZE_BYTES: 32 * 1024, // 32 KB
  DEFAULT_CPU_TIME_LIMIT_SECONDS: 2.0,
  MAX_CPU_TIME_LIMIT_SECONDS: 10.0,
  DEFAULT_WALL_TIME_LIMIT_SECONDS: 5.0,
  DEFAULT_MEMORY_LIMIT_KB: 128000, // 128 MB
  MAX_MEMORY_LIMIT_KB: 256000, // 256 MB
} as const;

export interface SupportedLanguageItem {
  id: number;
  key: 'cpp' | 'java' | 'python' | 'javascript';
  name: string;
  version: string;
  extension: string;
  monacoLang: string;
}

export const OFFICIAL_JUDGE0_LANGUAGES: SupportedLanguageItem[] = [
  {
    id: 54,
    key: 'cpp',
    name: 'C++17 (GCC 9.2.0)',
    version: '9.2.0',
    extension: 'cpp',
    monacoLang: 'cpp',
  },
  {
    id: 62,
    key: 'java',
    name: 'Java (OpenJDK 13.0.1)',
    version: '13.0.1',
    extension: 'java',
    monacoLang: 'java',
  },
  {
    id: 71,
    key: 'python',
    name: 'Python 3 (3.8.1)',
    version: '3.8.1',
    extension: 'py',
    monacoLang: 'python',
  },
  {
    id: 63,
    key: 'javascript',
    name: 'JavaScript (Node.js 12.14.0)',
    version: '12.14.0',
    extension: 'js',
    monacoLang: 'javascript',
  },
];

export interface CodeExecutionRequestDto {
  languageKey?: 'cpp' | 'java' | 'python' | 'javascript';
  languageId?: number;
  sourceCode: string;
  stdin?: string;
  isTestRun?: boolean;
}

export interface NormalizedExecutionStatus {
  id: number;
  description: string;
  isSuccess: boolean;
  isCompilationError: boolean;
  isRuntimeError: boolean;
  isTimeLimitExceeded: boolean;
  isMemoryLimitExceeded: boolean;
}

export interface CodeExecutionResultDto {
  submissionId?: string;
  token?: string;
  status: NormalizedExecutionStatus;
  stdout: string | null;
  stderr: string | null;
  compileOutput: string | null;
  executionTimeSeconds: number | null;
  memoryUsageKb: number | null;
  isTestRun: boolean;
  executedAt: string;
}

export interface Judge0SubmissionResponse {
  token: string;
  stdout: string | null;
  time: string | null;
  memory: number | null;
  stderr: string | null;
  token_id?: string;
  compile_output: string | null;
  message: string | null;
  status: {
    id: number;
    description: string;
  };
}

