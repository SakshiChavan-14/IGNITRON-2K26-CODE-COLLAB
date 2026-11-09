import {
  Controller,
  Get,
  Put,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { WorkspaceService } from './workspace.service';
import { SaveDraftDto } from './dto/workspace.dto';
import { AuthTeamUser } from '@ignitron/shared';

@Controller('workspace')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  /**
   * Load the saved workspace draft for the current or specified round
   */
  @Get('draft')
  @Roles('TEAM')
  async getDraft(@Query('roundNumber') roundNumber: string, @Req() req: any) {
    const teamUser = req.user as AuthTeamUser;
    const parsedRound = roundNumber ? parseInt(roundNumber, 10) : undefined;
    const draft = await this.workspaceService.getDraft(teamUser, parsedRound);
    return { success: true, draft };
  }

  /**
   * Save / Autosave workspace draft for the authenticated team
   */
  @Put('draft')
  @Roles('TEAM')
  @HttpCode(HttpStatus.OK)
  async saveDraft(@Body() dto: SaveDraftDto, @Req() req: any) {
    const teamUser = req.user as AuthTeamUser;
    const draft = await this.workspaceService.saveDraft(dto, teamUser);
    return { success: true, draft };
  }
}
