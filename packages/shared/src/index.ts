/**
 * IGNITRON 2K26 — CODE RELAY
 * Shared Definitions & Types
 */

export const APPLICATION_METADATA = {
  name: 'IGNITRON 2K26',
  subtitle: 'CODE RELAY',
  version: '1.0.0-phase02',
  author: 'IGNITRON Technical Committee',
} as const;

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

