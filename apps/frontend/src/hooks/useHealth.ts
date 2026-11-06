import { useQuery } from '@tanstack/react-query';
import { healthService } from '../services/health.service';
import { HealthResponse, ReadinessResponse } from '@ignitron/shared';
import { useState } from 'react';
import { ApiError } from '../services/api';

export interface HealthState {
  data: HealthResponse | undefined;
  readiness: ReadinessResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: unknown;
  latencyMs: number | null;
  lastChecked: Date | null;
  backendStatus: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED';
  apiStatus: 'CHECKING' | 'HEALTHY' | 'UNHEALTHY';
  databaseStatus: 'CHECKING' | 'CONNECTED' | 'DISCONNECTED';
  refetch: () => void;
  isRefetching: boolean;
}

export function useHealth(pollIntervalMs = 4000): HealthState {
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const query = useQuery({
    queryKey: ['system-health-readiness'],
    queryFn: async (): Promise<{ health: HealthResponse; readiness?: ReadinessResponse }> => {
      const start = performance.now();
      try {
        const health = await healthService.getHealth();
        const duration = Math.round(performance.now() - start);
        setLatencyMs(duration);
        setLastChecked(new Date());

        // Probe readiness
        let readiness: ReadinessResponse | undefined;
        try {
          readiness = await healthService.getReadiness();
        } catch (rErr) {
          if (rErr instanceof ApiError && rErr.data && typeof rErr.data === 'object') {
            readiness = rErr.data as ReadinessResponse;
          }
        }

        return { health, readiness };
      } catch (err) {
        setLatencyMs(null);
        setLastChecked(new Date());
        throw err;
      }
    },
    refetchInterval: pollIntervalMs,
    refetchIntervalInBackground: true,
    retry: 1,
    staleTime: 2000,
  });

  let backendStatus: 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' = 'CONNECTING';
  let apiStatus: 'CHECKING' | 'HEALTHY' | 'UNHEALTHY' = 'CHECKING';
  let databaseStatus: 'CHECKING' | 'CONNECTED' | 'DISCONNECTED' = 'CHECKING';

  if (query.isLoading && !query.data) {
    backendStatus = 'CONNECTING';
    apiStatus = 'CHECKING';
    databaseStatus = 'CHECKING';
  } else if (query.isSuccess && query.data?.health.status === 'ok') {
    backendStatus = 'CONNECTED';
    apiStatus = 'HEALTHY';

    if (query.data.readiness?.checks?.database === 'connected') {
      databaseStatus = 'CONNECTED';
    } else {
      databaseStatus = 'DISCONNECTED';
    }
  } else {
    backendStatus = 'DISCONNECTED';
    apiStatus = 'UNHEALTHY';
    databaseStatus = 'DISCONNECTED';
  }

  return {
    data: query.data?.health,
    readiness: query.data?.readiness,
    isLoading: query.isLoading,
    isError: query.isError,
    isSuccess: query.isSuccess,
    error: query.error,
    latencyMs,
    lastChecked,
    backendStatus,
    apiStatus,
    databaseStatus,
    refetch: () => {
      void query.refetch();
    },
    isRefetching: query.isRefetching,
  };
}
