import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthTeamUser } from '@ignitron/shared';
import { ArenaService } from './arena.service';
import {
  SaveMcqAnswerDto,
  SubmitMcqAnswersDto,
} from '@ignitron/shared';

@Controller('arena')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('TEAM')
export class ArenaController {
  constructor(private readonly arenaService: ArenaService) {}

  /**
   * Contestant: Check access eligibility and competition state for a specific round
   */
  @Get('status/:roundNumber')
  async getRoundAccess(
    @CurrentUser() teamUser: AuthTeamUser,
    @Param('roundNumber', ParseIntPipe) roundNumber: number,
  ) {
    const data = await this.arenaService.assertRoundAccess(teamUser, roundNumber, 'READ');
    return {
      success: true,
      data: {
        roundNumber,
        durationMinutes: data.round.durationMinutes,
        eligibilityStatus: data.progress.eligibilityStatus,
        participationStatus: data.progress.participationStatus,
        isRoundActive: data.isRoundActive,
        isPaused: data.isPaused,
        remainingSeconds: data.remainingSeconds,
        deadlineAt: data.state?.deadlineAt ? data.state.deadlineAt.toISOString() : null,
      },
    };
  }

  /**
   * Contestant: Get current MCQ arena state (questions, answers, timer)
   */
  @Get('mcq/state')
  async getMcqState(@CurrentUser() teamUser: AuthTeamUser) {
    const data = await this.arenaService.getMcqArenaState(teamUser);
    return { success: true, data };
  }

  /**
   * Contestant: Autosave single MCQ answer
   */
  @Post('mcq/save')
  @HttpCode(HttpStatus.OK)
  async saveMcqAnswer(
    @CurrentUser() teamUser: AuthTeamUser,
    @Body() dto: SaveMcqAnswerDto,
  ) {
    return this.arenaService.saveMcqAnswer(teamUser, dto);
  }

  /**
   * Contestant: Submit final MCQ answers for Round 1
   */
  @Post('mcq/submit')
  @HttpCode(HttpStatus.OK)
  async submitMcq(
    @CurrentUser() teamUser: AuthTeamUser,
    @Body() dto?: SubmitMcqAnswersDto,
  ) {
    const data = await this.arenaService.submitMcqRound(teamUser, dto?.autoSubmit || false);
    return { success: true, data };
  }

  /**
   * Contestant: Get workspace draft for a round and case number
   */
  @Get('workspace/draft')
  async getDraft(
    @CurrentUser() teamUser: AuthTeamUser,
    @Query('roundNumber') roundNumberStr?: string,
    @Query('caseNumber') caseNumberStr?: string,
  ) {
    const roundNumber = roundNumberStr ? parseInt(roundNumberStr, 10) : 2;
    const caseNumber = caseNumberStr ? parseInt(caseNumberStr, 10) : 1;
    const data = await this.arenaService.getWorkspaceDraft(teamUser, roundNumber, caseNumber);
    return { success: true, data };
  }

  /**
   * Contestant: Save workspace draft
   */
  @Post('workspace/draft')
  @HttpCode(HttpStatus.OK)
  async saveDraft(
    @CurrentUser() teamUser: AuthTeamUser,
    @Body()
    body: {
      roundNumber: number;
      caseNumber?: number;
      sourceCode: string;
      language: string;
    },
  ) {
    const data = await this.arenaService.saveWorkspaceDraft(
      teamUser,
      body.roundNumber,
      body.caseNumber || 1,
      body.sourceCode,
      body.language,
    );
    return { success: true, data };
  }

  /**
   * Contestant: Submit code for Round 2 or Round 3
   */
  @Post('workspace/submit')
  @HttpCode(HttpStatus.OK)
  async submitCode(
    @CurrentUser() teamUser: AuthTeamUser,
    @Body()
    body: {
      roundNumber: number;
      caseNumber?: number;
      sourceCode: string;
      language: string;
    },
  ) {
    const data = await this.arenaService.submitCode(
      teamUser,
      body.roundNumber,
      body.caseNumber || 1,
      body.sourceCode,
      body.language,
    );
    return { success: true, data };
  }
}
