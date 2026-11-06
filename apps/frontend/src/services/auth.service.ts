import {
  AdminLoginDto,
  TeamLoginDto,
  ChangePasswordDto,
  AuthUser,
  AuthAdminUser,
  AuthTeamUser,
  TeamLookupResponse,
} from '@ignitron/shared';
import { apiClient } from './api';

export const authService = {
  async adminLogin(dto: AdminLoginDto): Promise<AuthAdminUser> {
    const res = await apiClient<{ success: boolean; user: AuthAdminUser }>(
      '/auth/admin/login',
      {
        method: 'POST',
        body: JSON.stringify(dto),
      },
    );
    return res.user;
  },

  async lookupTeam(teamCode: string): Promise<TeamLookupResponse> {
    const res = await apiClient<{ success: boolean; team: TeamLookupResponse }>(
      `/auth/team/lookup/${encodeURIComponent(teamCode)}`,
    );
    return res.team;
  },

  async teamLogin(dto: TeamLoginDto): Promise<AuthTeamUser> {
    const res = await apiClient<{ success: boolean; user: AuthTeamUser }>(
      '/auth/team/login',
      {
        method: 'POST',
        body: JSON.stringify(dto),
      },
    );
    return res.user;
  },

  async getMe(): Promise<AuthUser> {
    const res = await apiClient<{ success: boolean; user: AuthUser }>('/auth/me');
    return res.user;
  },

  async heartbeat(): Promise<{ status: string; lastActivityAt: string }> {
    return apiClient<{ status: string; lastActivityAt: string }>(
      '/auth/heartbeat',
      {
        method: 'POST',
      },
    );
  },

  async changePassword(dto: ChangePasswordDto): Promise<{ message: string }> {
    return apiClient<{ success: boolean; message: string }>(
      '/auth/change-password',
      {
        method: 'POST',
        body: JSON.stringify(dto),
      },
    );
  },

  async logout(): Promise<void> {
    await apiClient('/auth/logout', {
      method: 'POST',
    });
  },
};

