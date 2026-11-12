import {
  CompetitionStateDto,
  RoundControlDto,
  ShortlistingTeamItem,
  ShortlistSubmissionDto,
  ShortlistSubmissionResult,
  TeamCompetitionStatusDto,
  CompetitionActivityLogItem,
  LeaderboardResponseDto,
  PublishLeaderboardDto,
} from '@ignitron/shared';
import { apiClient } from './api';

export const competitionService = {
  async getCompetitionState(): Promise<CompetitionStateDto> {
    const res = await apiClient<{ success: boolean; data: CompetitionStateDto }>(
      '/competition/state',
    );
    return res.data;
  },

  async executeControl(dto: RoundControlDto): Promise<{ message: string }> {
    return apiClient<{ success: boolean; message: string }>(
      '/competition/control',
      {
        method: 'POST',
        body: JSON.stringify(dto),
      },
    );
  },

  async getShortlistingTeams(roundNumber: number): Promise<ShortlistingTeamItem[]> {
    const res = await apiClient<{ success: boolean; data: ShortlistingTeamItem[] }>(
      `/competition/shortlisting/${roundNumber}`,
    );
    return res.data;
  },

  async submitShortlisting(
    dto: ShortlistSubmissionDto,
  ): Promise<ShortlistSubmissionResult> {
    const res = await apiClient<{
      success: boolean;
      data: ShortlistSubmissionResult;
    }>('/competition/shortlisting', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    return res.data;
  },

  async getTeamCompetitionStatus(): Promise<TeamCompetitionStatusDto> {
    const res = await apiClient<{
      success: boolean;
      data: TeamCompetitionStatusDto;
    }>('/competition/team-status');
    return res.data;
  },

  async getActivityLogs(): Promise<CompetitionActivityLogItem[]> {
    const res = await apiClient<{
      success: boolean;
      data: CompetitionActivityLogItem[];
    }>('/competition/activity-logs');
    return res.data;
  },

  async generateDemoData(count = 20): Promise<{ message: string; demoPassword: string }> {
    return apiClient<{
      success: boolean;
      message: string;
      demoPassword: string;
    }>('/competition/demo-data', {
      method: 'POST',
      body: JSON.stringify({ count }),
    });
  },

  async getLeaderboard(roundNumber?: number): Promise<LeaderboardResponseDto> {
    const url = roundNumber
      ? `/competition/leaderboard?roundNumber=${roundNumber}`
      : '/competition/leaderboard';
    const res = await apiClient<{ success: boolean; data: LeaderboardResponseDto }>(url);
    return res.data;
  },

  async publishLeaderboard(
    dto: PublishLeaderboardDto,
  ): Promise<{ message: string; isPublished: boolean }> {
    const res = await apiClient<{
      success: boolean;
      data: { message: string; isPublished: boolean };
    }>('/competition/leaderboard/publish', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    return res.data;
  },
};
