/**
 * IGNITRON 2K26 — CODE RELAY
 * Shared Definitions & Types
 */

export const APPLICATION_METADATA = {
  name: 'IGNITRON 2K26',
  subtitle: 'CODE RELAY',
  version: '1.0.0-phase03',
  author: 'IGNITRON Technical Committee',
} as const;

export const SESSION_CONFIG = {
  COOKIE_NAME: 'ignitron_session',
  HEARTBEAT_INTERVAL_MS: 30000, // 30 seconds
  SESSION_TIMEOUT_MINUTES: 15,
  MAX_PASSWORD_LENGTH: 128,
  MIN_PASSWORD_LENGTH: 8,
} as const;

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
