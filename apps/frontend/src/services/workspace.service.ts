import {
  WorkspaceDraftDto,
  SaveWorkspaceDraftDto,
  ApiResponse,
} from '@ignitron/shared';

const API_BASE = '/api/workspace';

export const workspaceService = {
  /**
   * Fetch the saved draft for the authenticated team
   */
  async getDraft(roundNumber?: number): Promise<WorkspaceDraftDto> {
    const query = roundNumber ? `?roundNumber=${roundNumber}` : '';
    const res = await fetch(`${API_BASE}/draft${query}`, {
      headers: {
        'Accept': 'application/json',
      },
      credentials: 'include',
    });

    const body: ApiResponse<{ draft: WorkspaceDraftDto }> = await res.json();

    if (!res.ok) {
      const errorMsg =
        (body as any)?.message ||
        (body as any)?.error?.message ||
        `Failed to load workspace draft (HTTP ${res.status})`;
      throw new Error(errorMsg);
    }

    return (body as any).draft;
  },

  /**
   * Save / Autosave workspace draft
   */
  async saveDraft(dto: SaveWorkspaceDraftDto): Promise<WorkspaceDraftDto> {
    const res = await fetch(`${API_BASE}/draft`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(dto),
    });

    const body: ApiResponse<{ draft: WorkspaceDraftDto }> = await res.json();

    if (!res.ok) {
      const errorMsg =
        (body as any)?.message ||
        (body as any)?.error?.message ||
        `Failed to save draft (HTTP ${res.status})`;
      throw new Error(errorMsg);
    }

    return (body as any).draft;
  },
};
