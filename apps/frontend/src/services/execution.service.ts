import {
  CodeExecutionRequestDto,
  CodeExecutionResultDto,
  SupportedLanguageItem,
  ApiResponse,
} from '@ignitron/shared';

const API_BASE = '/api/execution';

export const executionService = {
  /**
   * Fetch officially supported languages from backend
   */
  async getSupportedLanguages(): Promise<SupportedLanguageItem[]> {
    const res = await fetch(`${API_BASE}/languages`, {
      headers: {
        'Accept': 'application/json',
      },
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error(`Failed to load supported languages (HTTP ${res.status})`);
    }
    const data = await res.json();
    return data.languages;
  },

  /**
   * Check Judge0 service health
   */
  async getHealth(): Promise<{ status: string; judge0Url: string }> {
    const res = await fetch(`${API_BASE}/health`, {
      headers: {
        'Accept': 'application/json',
      },
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error(`Failed to check execution health (HTTP ${res.status})`);
    }
    return res.json();
  },

  /**
   * Execute sample code / test run
   */
  async runCode(dto: CodeExecutionRequestDto): Promise<CodeExecutionResultDto> {
    const res = await fetch(`${API_BASE}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(dto),
    });

    const body: ApiResponse<{ result: CodeExecutionResultDto }> = await res.json();

    if (!res.ok) {
      const errorMsg =
        (body as any)?.message ||
        (body as any)?.error?.message ||
        `Code execution rejected (HTTP ${res.status})`;
      throw new Error(errorMsg);
    }

    return (body as any).result;
  },

  /**
   * Retrieve execution output by ID
   */
  async getResult(id: string): Promise<CodeExecutionResultDto> {
    const res = await fetch(`${API_BASE}/result/${id}`, {
      headers: {
        'Accept': 'application/json',
      },
      credentials: 'include',
    });

    const body: ApiResponse<{ result: CodeExecutionResultDto }> = await res.json();

    if (!res.ok) {
      const errorMsg =
        (body as any)?.message ||
        (body as any)?.error?.message ||
        `Failed to retrieve execution result (HTTP ${res.status})`;
      throw new Error(errorMsg);
    }

    return (body as any).result;
  },
};

