import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CodeExecutionService } from './code-execution.service';
import { ExecuteCodeDto } from './dto/execute-code.dto';
import { AuthTeamUser } from '@ignitron/shared';

@Controller('execution')
export class CodeExecutionController {
  constructor(private readonly executionService: CodeExecutionService) {}

  /**
   * List supported programming languages with official Judge0 IDs
   */
  @Get('languages')
  async getLanguages() {
    const languages = await this.executionService.getSupportedLanguages();
    return { success: true, languages };
  }

  /**
   * Health and connectivity check for Judge0 CE
   */
  @Get('health')
  async getHealth() {
    const health = await this.executionService.checkHealth();
    return { success: true, ...health };
  }

  /**
   * Execute code / sample test run (Team Participant only)
   */
  @Post('run')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('TEAM')
  @HttpCode(HttpStatus.OK)
  async runCode(@Body() dto: ExecuteCodeDto, @Req() req: any) {
    const teamUser = req.user as AuthTeamUser;
    const result = await this.executionService.executeCode(dto, teamUser, false);
    return { success: true, result };
  }

  /**
   * Retrieve execution result by ID
   */
  @Get('result/:id')
  @UseGuards(JwtAuthGuard)
  async getResult(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    const isTeam = user.type === 'TEAM';
    const isAdmin = user.type === 'ADMIN';
    const teamId = isTeam ? user.id : undefined;

    const result = await this.executionService.getSubmissionResult(id, teamId, isAdmin);
    return { success: true, result };
  }

  /**
   * Development-only execution verification endpoint
   * Strictly blocked when NODE_ENV === 'production'
   */
  @Post('dev/run')
  @HttpCode(HttpStatus.OK)
  async runDevCode(@Body() dto: ExecuteCodeDto, @Req() req: any) {
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException('Development execution endpoint is disabled in production environments.');
    }

    // Mock a fallback team user if unauthenticated for rapid developer debugging
    const mockTeamUser: AuthTeamUser = req.user?.type === 'TEAM'
      ? req.user
      : {
          id: 'dev-team-id',
          type: 'TEAM',
          teamCode: 'DEV-TEAM',
          teamName: 'Developer Test Team',
          mustChangePassword: false,
          activeParticipant: {
            id: 'dev-part-id',
            fullName: 'Dev Runner',
            email: 'dev@ignitron.local',
          },
          sessionId: 'dev-session-id',
        };

    const result = await this.executionService.executeCode(dto, mockTeamUser, true);
    return { success: true, result };
  }
}

