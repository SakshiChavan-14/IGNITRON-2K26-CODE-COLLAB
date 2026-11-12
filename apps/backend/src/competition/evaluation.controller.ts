import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser, SubmissionStatus, GradeSubmissionDto } from '@ignitron/shared';
import { EvaluationService } from './evaluation.service';

@Controller('competition/evaluation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  /**
   * Admin: List submissions with filters
   */
  @Get('submissions')
  async listSubmissions(
    @Query('roundNumber') roundNumber?: string,
    @Query('teamId') teamId?: string,
    @Query('status') status?: string,
  ) {
    const rNum = roundNumber ? parseInt(roundNumber, 10) : undefined;
    const subStatus = status ? (status.toUpperCase() as SubmissionStatus) : undefined;
    const data = await this.evaluationService.listSubmissions({
      roundNumber: rNum,
      teamId,
      status: subStatus,
    });
    return { success: true, data };
  }

  /**
   * Admin: Get single submission details for inspection / grading
   */
  @Get('submissions/:id')
  async getSubmissionDetail(@Param('id') id: string) {
    const data = await this.evaluationService.getSubmissionDetail(id);
    return { success: true, data };
  }

  /**
   * Admin: Grade submission with score breakdown & feedback
   */
  @Post('submissions/:id/grade')
  @HttpCode(HttpStatus.OK)
  async gradeSubmission(
    @Param('id') id: string,
    @CurrentUser() adminUser: AuthUser,
    @Body() dto: GradeSubmissionDto,
  ) {
    const data = await this.evaluationService.gradeSubmission(id, adminUser.id, dto);
    return { success: true, data };
  }

  /**
   * Admin: Review team's Round 1 MCQ answer sheet
   */
  @Get('teams/:teamId/mcq')
  async getTeamMcqReview(@Param('teamId') teamId: string) {
    const data = await this.evaluationService.getTeamMcqReview(teamId);
    return { success: true, data };
  }
}
