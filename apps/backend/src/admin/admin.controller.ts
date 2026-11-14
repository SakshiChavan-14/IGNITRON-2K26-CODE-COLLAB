import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '@ignitron/shared';
import { AdminService } from './admin.service';
import {
  CreateTeamDto,
  UpdateTeamDto,
  ToggleTeamStatusDto,
} from './dto/admin-teams.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard-stats')
  async getDashboardStats() {
    const stats = await this.adminService.getDashboardStats();
    return { success: true, data: stats };
  }

  @Get('teams')
  async getTeams(
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    const teams = await this.adminService.getTeams(search, status);
    return { success: true, data: teams };
  }

  @Get('teams/export/csv')
  async exportTeamsCsv(@Res() res: Response) {
    const csvData = await this.adminService.exportTeamsCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="ignitron_teams_${Date.now()}.csv"`,
    );
    return res.send(csvData);
  }

  @Get('teams/:id')
  async getTeamById(@Param('id') id: string) {
    const team = await this.adminService.getTeamById(id);
    return { success: true, data: team };
  }

  @Post('teams')
  async createTeam(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTeamDto,
  ) {
    const result = await this.adminService.createTeam(dto, user.id);
    return { success: true, ...result };
  }

  @Patch('teams/:id')
  async updateTeam(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateTeamDto,
  ) {
    const updatedTeam = await this.adminService.updateTeam(id, dto, user.id);
    return { success: true, data: updatedTeam };
  }

  @Patch('teams/:id/status')
  async toggleTeamStatus(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ToggleTeamStatusDto,
  ) {
    const result = await this.adminService.toggleTeamStatus(id, dto, user.id);
    return { success: true, ...result };
  }

  @Delete('teams/:id')
  async deleteTeam(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.adminService.deleteTeam(id, user.id);
    return { success: true, ...result };
  }

  @Post('teams/:id/reset-password')
  @HttpCode(HttpStatus.OK)
  async resetTeamPassword(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    const credentials = await this.adminService.resetTeamPassword(id, user.id);
    return { success: true, data: credentials };
  }

  @Post('teams/:id/revoke-session')
  @HttpCode(HttpStatus.OK)
  async revokeActiveSession(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.adminService.revokeActiveSession(id, user.id);
    return { success: true, ...result };
  }
}
