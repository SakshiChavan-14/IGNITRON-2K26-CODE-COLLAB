import {
  AnnouncementItem,
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from '@ignitron/shared';
import { apiClient } from './api';

export const announcementService = {
  /**
   * Public/Team: Get all published announcements
   */
  async getPublishedAnnouncements(): Promise<AnnouncementItem[]> {
    const res = await apiClient<{ success: boolean; data: AnnouncementItem[] }>(
      '/announcements',
    );
    return res.data;
  },

  /**
   * Admin: Get all announcements (published + drafts)
   */
  async getAllAnnouncements(): Promise<AnnouncementItem[]> {
    const res = await apiClient<{ success: boolean; data: AnnouncementItem[] }>(
      '/admin/announcements',
    );
    return res.data;
  },

  /**
   * Admin: Create a new announcement
   */
  async createAnnouncement(dto: CreateAnnouncementDto): Promise<AnnouncementItem> {
    const res = await apiClient<{ success: boolean; data: AnnouncementItem }>(
      '/admin/announcements',
      {
        method: 'POST',
        body: JSON.stringify(dto),
      },
    );
    return res.data;
  },

  /**
   * Admin: Update an existing announcement
   */
  async updateAnnouncement(
    id: string,
    dto: UpdateAnnouncementDto,
  ): Promise<AnnouncementItem> {
    const res = await apiClient<{ success: boolean; data: AnnouncementItem }>(
      `/admin/announcements/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(dto),
      },
    );
    return res.data;
  },

  /**
   * Admin: Toggle announcement publication
   */
  async togglePublish(
    id: string,
    isPublished: boolean,
  ): Promise<AnnouncementItem> {
    const res = await apiClient<{ success: boolean; data: AnnouncementItem }>(
      `/admin/announcements/${id}/publish`,
      {
        method: 'PATCH',
        body: JSON.stringify({ isPublished }),
      },
    );
    return res.data;
  },

  /**
   * Admin: Delete an announcement
   */
  async deleteAnnouncement(id: string): Promise<{ success: boolean }> {
    return apiClient<{ success: boolean }>(`/admin/announcements/${id}`, {
      method: 'DELETE',
    });
  },
};
