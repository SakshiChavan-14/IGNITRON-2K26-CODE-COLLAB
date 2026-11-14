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
  const calculateRemaining = (): number => {
    if (isPaused) {
      return remainingSecondsFromServer ?? 0;
    }
    if (deadlineAt) {
      const deadline = new Date(deadlineAt).getTime();
      const now = Date.now();
      return Math.max(0, Math.floor((deadline - now) / 1000));
    }
    return remainingSecondsFromServer ?? 0;
  };

  const [secondsLeft, setSecondsLeft] = useState<number>(calculateRemaining);

  useEffect(() => {
    setSecondsLeft(calculateRemaining());

    if (isPaused || !deadlineAt) {
      return;
    }

    const interval = setInterval(() => {
      const deadline = new Date(deadlineAt).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((deadline - now) / 1000));
      setSecondsLeft(remaining);
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

/**
 * Server-authoritative synchronized countdown hook:
 * Calculates real-time countdown (e.g. 5, 4, 3, 2, 1, GO!) based strictly on server `countdownEndsAt` timestamp.
 * Refreshing the page or reconnecting recalculates remaining seconds without resetting the countdown.
 */
export const useSynchronizedCountdown = (
  countdown: {
    active: boolean;
    roundNumber: number;
    startedAt: string;
    endsAt: string;
    remainingSeconds: number;
    durationSeconds: number;
  } | null | undefined,
) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    if (!countdown || !countdown.active) return 0;
    const endsMs = new Date(countdown.endsAt).getTime();
    return Math.max(0, Math.ceil((endsMs - Date.now()) / 1000));
  });

  useEffect(() => {
    if (!countdown || !countdown.active) {
      setSecondsRemaining(0);
      return;
    }

    const calc = () => {
      const endsMs = new Date(countdown.endsAt).getTime();
      const left = Math.max(0, Math.ceil((endsMs - Date.now()) / 1000));
      setSecondsRemaining(left);
    };

    calc();
    const interval = setInterval(calc, 250);
    return () => clearInterval(interval);
  }, [countdown?.active, countdown?.endsAt]);

  const isGo = secondsRemaining === 0 && !!countdown?.active;

  return {
    isActive: Boolean(countdown?.active),
    roundNumber: countdown?.roundNumber ?? 1,
    secondsRemaining,
    isGo,
    displayNumber: isGo ? 'GO!' : secondsRemaining.toString(),
  };
};
