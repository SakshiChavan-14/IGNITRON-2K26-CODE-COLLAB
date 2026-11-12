import { apiClient } from './api';
import {
  QuestionDto,
  SanitizedQuestionDto,
  CreateQuestionDto,
  UpdateQuestionDto,
  McqArenaStateDto,
  SaveMcqAnswerDto,
  SubmitMcqAnswersDto,
  McqSubmissionResultDto,
  AdminSubmissionListItem,
  AdminSubmissionDetailDto,
  GradeSubmissionDto,
} from '@ignitron/shared';

export interface ApiResponseWrapper<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const questionAndArenaService = {
  // --------------------------------------------------------------------------
  // ADMIN QUESTIONS
  // --------------------------------------------------------------------------
  async listAdminQuestions(roundNumber?: number, type?: string): Promise<QuestionDto[]> {
    const params = new URLSearchParams();
    if (roundNumber) params.append('roundNumber', roundNumber.toString());
    if (type) params.append('type', type);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    const res = await apiClient<ApiResponseWrapper<QuestionDto[]>>(
      `/competition/questions${queryString}`,
    );
    return res.data;
  },

  async getAdminQuestion(id: string): Promise<QuestionDto> {
    const res = await apiClient<ApiResponseWrapper<QuestionDto>>(
      `/competition/questions/${id}`,
    );
    return res.data;
  },

  async createQuestion(dto: CreateQuestionDto): Promise<QuestionDto> {
    const res = await apiClient<ApiResponseWrapper<QuestionDto>>('/competition/questions', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    return res.data;
  },

  async updateQuestion(id: string, dto: UpdateQuestionDto): Promise<QuestionDto> {
    const res = await apiClient<ApiResponseWrapper<QuestionDto>>(
      `/competition/questions/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(dto),
      },
    );
    return res.data;
  },

  async deleteQuestion(id: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient<{ success: boolean; message: string }>(
      `/competition/questions/${id}`,
      {
        method: 'DELETE',
      },
    );
    return res;
  },

  async seedQuestions(): Promise<{ seededCount: number; message: string }> {
    const res = await apiClient<ApiResponseWrapper<{ seededCount: number; message: string }>>(
      '/competition/questions/seed',
      {
        method: 'POST',
      },
    );
    return res.data;
  },

  // --------------------------------------------------------------------------
  // CONTESTANT ARENA & SANITIZED QUESTIONS
  // --------------------------------------------------------------------------
  async getQuestionsForRound(roundNumber: number): Promise<SanitizedQuestionDto[]> {
    const res = await apiClient<ApiResponseWrapper<SanitizedQuestionDto[]>>(
      `/competition/questions/round/${roundNumber}`,
    );
    return res.data;
  },

  async getMcqArenaState(): Promise<McqArenaStateDto> {
    const res = await apiClient<ApiResponseWrapper<McqArenaStateDto>>('/arena/mcq/state');
    return res.data;
  },

  async saveMcqAnswer(dto: SaveMcqAnswerDto) {
    const res = await apiClient<ApiResponseWrapper<any>>('/arena/mcq/save', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    return res.data;
  },

  async submitMcqRound(dto?: SubmitMcqAnswersDto): Promise<McqSubmissionResultDto> {
    const res = await apiClient<ApiResponseWrapper<McqSubmissionResultDto>>(
      '/arena/mcq/submit',
      {
        method: 'POST',
        body: JSON.stringify(dto || {}),
      },
    );
    return res.data;
  },

  async getWorkspaceDraft(roundNumber: number, caseNumber = 1) {
    const res = await apiClient<ApiResponseWrapper<{
      sourceCode: string;
      language: string;
      version: number;
      updatedAt: string;
    }>>(`/arena/workspace/draft?roundNumber=${roundNumber}&caseNumber=${caseNumber}`);
    return res.data;
  },

  async saveWorkspaceDraft(payload: {
    roundNumber: number;
    caseNumber?: number;
    sourceCode: string;
    language: string;
  }) {
    const res = await apiClient<ApiResponseWrapper<any>>('/arena/workspace/draft', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async submitWorkspaceCode(payload: {
    roundNumber: number;
    caseNumber?: number;
    sourceCode: string;
    language: string;
  }) {
    const res = await apiClient<ApiResponseWrapper<{
      submissionId: string;
      status: string;
      submittedAt: string;
      message: string;
    }>>('/arena/workspace/submit', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  // --------------------------------------------------------------------------
  // ADMIN EVALUATION & SUBMISSIONS
  // --------------------------------------------------------------------------
  async listSubmissions(params?: {
    roundNumber?: number;
    teamId?: string;
    status?: string;
  }): Promise<AdminSubmissionListItem[]> {
    const qp = new URLSearchParams();
    if (params?.roundNumber) qp.append('roundNumber', params.roundNumber.toString());
    if (params?.teamId) qp.append('teamId', params.teamId);
    if (params?.status) qp.append('status', params.status);
    const queryString = qp.toString() ? `?${qp.toString()}` : '';

    const res = await apiClient<ApiResponseWrapper<AdminSubmissionListItem[]>>(
      `/competition/evaluation/submissions${queryString}`,
    );
    return res.data;
  },

  async getSubmissionDetail(id: string): Promise<AdminSubmissionDetailDto> {
    const res = await apiClient<ApiResponseWrapper<AdminSubmissionDetailDto>>(
      `/competition/evaluation/submissions/${id}`,
    );
    return res.data;
  },

  async gradeSubmission(id: string, dto: GradeSubmissionDto) {
    const res = await apiClient<ApiResponseWrapper<{
      success: boolean;
      message: string;
      submissionId: string;
      score: number;
    }>>(`/competition/evaluation/submissions/${id}/grade`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
    return res.data;
  },

  async getTeamMcqReview(teamId: string) {
    const res = await apiClient<ApiResponseWrapper<{
      team: { id: string; teamName: string; teamCode: string; institution?: string | null };
      roundNumber: number;
      score: number;
      participationStatus: string;
      submittedAt: string | null;
      totalQuestions: number;
      correctCount: number;
      questions: Array<{
        questionId: string;
        orderNumber: number;
        title: string;
        description: string;
        options: string[];
        correctOption: number;
        explanation?: string | null;
        marks: number;
        selectedOption: number | null;
        isFlagged: boolean;
        isCorrect: boolean;
      }>;
    }>>(`/competition/evaluation/teams/${teamId}/mcq`);
    return res.data;
  },
};

