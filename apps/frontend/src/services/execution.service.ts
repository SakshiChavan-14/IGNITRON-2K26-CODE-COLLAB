import {
  CodeExecutionRequestDto,
  CodeExecutionResultDto,
  SupportedLanguageItem,
  ApiResponse,
} from '@ignitron/shared';
import { apiClient } from './api';

export const executionService = {
  /**
   * Fetch officially supported languages from backend
   */
  async getSupportedLanguages(): Promise<SupportedLanguageItem[]> {
    const data = await apiClient<{ languages: SupportedLanguageItem[] }>('/execution/languages');
    return data.languages;
  },

  /**
   * Check Judge0 service health
   */
  async getHealth(): Promise<{ status: string; judge0Url: string }> {
    return apiClient<{ status: string; judge0Url: string }>('/execution/health');
  },

  /**
   * Execute sample code / test run
   */
  async runCode(dto: CodeExecutionRequestDto): Promise<CodeExecutionResultDto> {
    const data = await apiClient<ApiResponse<{ result: CodeExecutionResultDto }>>('/execution/run', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    return (data as any).result;
  },

  /**
   * Retrieve execution output by ID
   */
  async getResult(id: string): Promise<CodeExecutionResultDto> {
    const data = await apiClient<ApiResponse<{ result: CodeExecutionResultDto }>>(`/execution/result/${id}`);
    return (data as any).result;
  },
};

