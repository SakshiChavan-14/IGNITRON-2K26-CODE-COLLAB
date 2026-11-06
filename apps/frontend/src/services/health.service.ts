import { apiClient } from './api';
import { HealthResponse, ReadinessResponse } from '@ignitron/shared';

export const healthService = {
  /**
   * Performs basic application liveness health check
   */
  async getHealth(): Promise<HealthResponse> {
    return apiClient<HealthResponse>('/health');
  },

  /**
   * Performs readiness verification across system subsystems
   */
  async getReadiness(): Promise<ReadinessResponse> {
    return apiClient<ReadinessResponse>('/health/ready');
  },
};

