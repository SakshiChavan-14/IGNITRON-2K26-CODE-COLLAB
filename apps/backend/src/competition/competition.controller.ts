import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser, AuthTeamUser } from '@ignitron/shared';
import { CompetitionService } from './competition.service';
import {
  RoundControlDto,
  ShortlistSubmissionDto,
  GenerateDemoDataDto,
  BackendPublishLeaderboardDto,
} from './dto/competition.dto';

@Controller('competition')
export class CompetitionController {
  constructor(private readonly competitionService: CompetitionService) {}

  /**
   * Public / Authenticated authoritative global competition state & server timer
   */
  @Get('state')
  async getCompetitionState() {
    const state = await this.competitionService.getCompetitionState();
    return { success: true, data: state };
  }

  /**
   * Administrator Competition Control Actions (Start, Pause, Resume, End, Complete, Reset)
   */
  @Post('control')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async executeControl(
    @CurrentUser() user: AuthUser,
    @Body() dto: RoundControlDto,
  ) {
    const result = await this.competitionService.executeRoundControl(dto, user.id);
    return { success: true, ...result };
  }

  /**
   * Administrator: Get candidates for shortlisting into target round (Round 2 or 3)
   */
  @Get('shortlisting/:roundNumber')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getShortlistingTeams(
    @Param('roundNumber', ParseIntPipe) roundNumber: number,
  ) {
    const teams = await this.competitionService.getShortlistingTeams(roundNumber);
    return { success: true, data: teams };
  }

  /**
   * Administrator: Submit shortlisting decisions
   */
  @Post('shortlisting')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async submitShortlisting(
    @CurrentUser() user: AuthUser,
    @Body() dto: ShortlistSubmissionDto,
  ) {
    const result = await this.competitionService.submitShortlisting(dto, user.id);
    return { success: true, data: result };
  }

  /**
   * Team: Get authenticated team's competition status, round eligibility, and timer
   */
  @Get('team-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TEAM')
  async getTeamCompetitionStatus(@CurrentUser() user: AuthTeamUser) {
    const status = await this.competitionService.getTeamCompetitionStatus(user.id);
    return { success: true, data: status };
  }

  /**
   * Leaderboard: Get leaderboard entries. Non-admin users can only view published entries.
   */
  @Get('leaderboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'TEAM')
  async getLeaderboard(
    @CurrentUser() user: AuthUser,
    @Query('roundNumber') roundNumber?: string,
  ) {
    const parsedRound = roundNumber ? parseInt(roundNumber, 10) : undefined;
    const leaderboard = await this.competitionService.getLeaderboard(user, parsedRound);
    return { success: true, data: leaderboard };
  }

  /**
   * Leaderboard: Admin publish or unpublish leaderboard
   */
  @Post('leaderboard/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async publishLeaderboard(
    @CurrentUser() user: AuthUser,
    @Body() dto: BackendPublishLeaderboardDto,
  ) {
    const result = await this.competitionService.publishLeaderboard(dto, user.id);
    return { success: true, data: result };
  }

  /**
   * Leaderboard: Admin declares official tournament winner
   */
  @Post('declare-winner')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async declareWinner(
    @CurrentUser() user: AuthUser,
    @Body() dto: { teamId: string; notes?: string },
  ) {
    const result = await this.competitionService.declareWinner(dto, user.id);
    return { success: true, data: result };
  }

  /**
   * Administrator: Recent competition activity logs
   */
  @Get('activity-logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getActivityLogs() {
    const logs = await this.competitionService.getRecentActivityLogs();
    return { success: true, data: logs };
  }

  /**
   * Administrator: Generate demonstration teams for professor presentation
   */
  @Post('demo-data')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async generateDemoData(
    @CurrentUser() user: AuthUser,
    @Body() dto: GenerateDemoDataDto,
  ) {
    const result = await this.competitionService.generateDemoData(dto, user.id);
    return { success: true, ...result };
  }
}
