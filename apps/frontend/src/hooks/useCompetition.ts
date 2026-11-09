import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { competitionService } from '../services/competition.service';

export const useCompetitionState = () => {
  return useQuery({
    queryKey: ['competitionState'],
    queryFn: () => competitionService.getCompetitionState(),
    refetchInterval: 5000, // 5 seconds polling per architecture specification
    staleTime: 3000,
  });
};

export const useTeamCompetitionStatus = (enabled = true) => {
  return useQuery({
    queryKey: ['teamCompetitionStatus'],
    queryFn: () => competitionService.getTeamCompetitionStatus(),
    refetchInterval: 5000, // 5 seconds polling
    staleTime: 3000,
    enabled,
  });
};

export const useCompetitionActivityLogs = () => {
  return useQuery({
    queryKey: ['competitionActivityLogs'],
    queryFn: () => competitionService.getActivityLogs(),
    refetchInterval: 10000, // 10 seconds polling
    staleTime: 5000,
  });
};

/**
 * Server-authoritative timer hook: calculates remaining countdown from server timestamps
 * Updates client display smoothly every second without trusting client clock for expiration.
 */
export const useServerTimer = (
  deadlineAt: string | null | undefined,
  isPaused: boolean,
  remainingSecondsFromServer: number | null | undefined,
) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  useEffect(() => {
    if (isPaused) {
      setSecondsLeft(remainingSecondsFromServer || 0);
      return;
    }

    if (!deadlineAt) {
      setSecondsLeft(0);
      return;
    }

    const calculateRemaining = () => {
      const deadline = new Date(deadlineAt).getTime();
      const now = Date.now();
      const diffSeconds = Math.max(0, Math.floor((deadline - now) / 1000));
      return diffSeconds;
    };

    setSecondsLeft(calculateRemaining());

    const interval = setInterval(() => {
      setSecondsLeft(calculateRemaining());
    }, 1000);

    return () => clearInterval(interval);
  }, [deadlineAt, isPaused, remainingSecondsFromServer]);

  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;

  const formatted = hours > 0
    ? `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    : `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return {
    secondsLeft,
    formatted,
    isExpired: secondsLeft <= 0 && !!deadlineAt,
  };
};
