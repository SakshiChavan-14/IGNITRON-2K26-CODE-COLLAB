import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthUser } from '@ignitron/shared';
import { AnnouncementService } from './announcement.service';
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
  TogglePublishDto,
} from './dto/announcement.dto';

@Controller()
export class AnnouncementController {
  constructor(private readonly announcementService: AnnouncementService) {}

  /**
   * Public & Participant: View published competition announcements only
   */
  @Get('announcements')
  async getPublishedAnnouncements() {
    const announcements = await this.announcementService.getPublishedAnnouncements();
    return { success: true, data: announcements };
  }

  /**
   * Admin: View all announcements (published and drafts)
   */
  @Get('admin/announcements')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getAllAnnouncements() {
    const announcements = await this.announcementService.getAllAnnouncements();
    return { success: true, data: announcements };
  }

  /**
   * Admin: Create a new tournament announcement
   */
  @Post('admin/announcements')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async createAnnouncement(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateAnnouncementDto,
  ) {
    const created = await this.announcementService.createAnnouncement(dto, user.id);
    return { success: true, data: created };
  }

  /**
   * Admin: Update an existing tournament announcement
   */
  @Patch('admin/announcements/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async updateAnnouncement(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateAnnouncementDto,
  ) {
    const updated = await this.announcementService.updateAnnouncement(id, dto, user.id);
    return { success: true, data: updated };
  }

  /**
   * Admin: Toggle publish / unpublish status
   */
  @Patch('admin/announcements/:id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async togglePublish(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: TogglePublishDto,
  ) {
    const updated = await this.announcementService.togglePublish(id, dto.isPublished, user.id);
    return { success: true, data: updated };
  }

  /**
   * Admin: Delete an announcement
   */
  @Delete('admin/announcements/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async deleteAnnouncement(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    const result = await this.announcementService.deleteAnnouncement(id, user.id);
    return result;
  }
}
