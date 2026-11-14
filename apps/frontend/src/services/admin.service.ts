import {
  DashboardStatsDto,
  TeamListItem,
  TeamCredentials,
  CreateTeamDto,
  UpdateTeamDto,
} from '@ignitron/shared';
import { apiClient } from './api';

export const adminService = {
  async getDashboardStats(): Promise<DashboardStatsDto> {
    const res = await apiClient<{ success: boolean; data: DashboardStatsDto }>(
      '/admin/dashboard-stats',
    );
    return res.data;
  },

  async getTeams(search?: string, status?: string): Promise<TeamListItem[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status) params.append('status', status);

    const qs = params.toString();
    const endpoint = `/admin/teams${qs ? `?${qs}` : ''}`;
    const res = await apiClient<{ success: boolean; data: TeamListItem[] }>(
      endpoint,
    );
    return res.data;
  },

  async getTeamById(id: string): Promise<any> {
    const res = await apiClient<{ success: boolean; data: any }>(
      `/admin/teams/${id}`,
    );
    return res.data;
  },

  async createTeam(
    dto: CreateTeamDto,
  ): Promise<{ team: TeamListItem; credentials: TeamCredentials }> {
    return apiClient<{
      success: boolean;
      team: TeamListItem;
      credentials: TeamCredentials;
    }>('/admin/teams', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async updateTeam(id: string, dto: UpdateTeamDto): Promise<any> {
    const res = await apiClient<{ success: boolean; data: any }>(
      `/admin/teams/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(dto),
      },
    );
    return res.data;
  },

  async toggleTeamStatus(
    id: string,
    isActive: boolean,
  ): Promise<{ message: string }> {
    return apiClient<{ success: boolean; message: string }>(
      `/admin/teams/${id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      },
    );
  },

  async resetPassword(id: string): Promise<TeamCredentials> {
    const res = await apiClient<{ success: boolean; data: TeamCredentials }>(
      `/admin/teams/${id}/reset-password`,
      {
        method: 'POST',
      },
    );
    return res.data;
  },

  async revokeSession(
    teamId: string,
  ): Promise<{ message: string; sessionsRevoked: number }> {
    return apiClient<{
      success: boolean;
      message: string;
      sessionsRevoked: number;
    }>(`/admin/teams/${teamId}/revoke-session`, {
      method: 'POST',
    });
  },

  async deleteTeam(
    id: string,
  ): Promise<{ message: string; deletedTeamCode: string }> {
    return apiClient<{
      success: boolean;
      message: string;
      deletedTeamCode: string;
    }>(`/admin/teams/${id}`, {
      method: 'DELETE',
    });
  },

  async exportTeamsCsv(): Promise<string> {
    const res = await fetch('/api/admin/teams/export/csv', {
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error('Failed to export CSV');
    }
    return res.text();
  },
};


