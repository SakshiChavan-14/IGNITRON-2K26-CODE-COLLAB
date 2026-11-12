import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
} from './dto/announcement.dto';
import { AnnouncementItem, AnnouncementPriority } from '@ignitron/shared';

@Injectable()
export class AnnouncementService {
  private readonly logger = new Logger(AnnouncementService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Public & Participant View: Return ONLY published announcements.
   * Unpublished announcements are strictly hidden.
   */
  async getPublishedAnnouncements(): Promise<AnnouncementItem[]> {
    const list = await this.prisma.announcement.findMany({
      where: { isPublished: true },
      include: {
        author: {
          select: { fullName: true },
        },
      },
      orderBy: [
        { publishedAt: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return list.map((a) => ({
      id: a.id,
      title: a.title,
      message: a.message,
      priority: a.priority as AnnouncementPriority,
      isPublished: true,
      publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
      authorName: a.author?.fullName || 'Competition Administrator',
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    }));
  }

  /**
   * Admin View: Return ALL announcements (published & drafts)
   */
  async getAllAnnouncements(): Promise<AnnouncementItem[]> {
    const list = await this.prisma.announcement.findMany({
      include: {
        author: {
          select: { fullName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return list.map((a) => ({
      id: a.id,
      title: a.title,
      message: a.message,
      priority: a.priority as AnnouncementPriority,
      isPublished: a.isPublished,
      publishedAt: a.publishedAt ? a.publishedAt.toISOString() : null,
      authorName: a.author?.fullName || 'System Admin',
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    }));
  }

  /**
   * Create an announcement (Admin only)
   */
  async createAnnouncement(
    dto: CreateAnnouncementDto,
    adminId: string,
  ): Promise<AnnouncementItem> {
    const isPublished = dto.isPublished ?? false;
    const publishedAt = isPublished ? new Date() : null;

    const created = await this.prisma.$transaction(async (tx) => {
      const ann = await tx.announcement.create({
        data: {
          title: dto.title.trim(),
          message: dto.message.trim(),
          priority: dto.priority || 'NORMAL',
          isPublished,
          publishedAt,
          authorId: adminId,
        },
        include: {
          author: { select: { fullName: true } },
        },
      });

      await tx.activityLog.create({
        data: {
          actorType: 'ADMIN',
          actorId: adminId,
          action: 'ANNOUNCEMENT_CREATED',
          description: `Admin created announcement "${ann.title}" (published: ${isPublished})`,
          metadata: { announcementId: ann.id, priority: ann.priority, isPublished },
        },
      });

      return ann;
    });

    this.logger.log(`Created announcement "${created.title}" [${created.id}]`);

    return {
      id: created.id,
      title: created.title,
      message: created.message,
      priority: created.priority as AnnouncementPriority,
      isPublished: created.isPublished,
      publishedAt: created.publishedAt ? created.publishedAt.toISOString() : null,
      authorName: created.author?.fullName || 'System Admin',
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  /**
   * Update an announcement (Admin only)
   */
  async updateAnnouncement(
    id: string,
    dto: UpdateAnnouncementDto,
    adminId: string,
  ): Promise<AnnouncementItem> {
    const existing = await this.prisma.announcement.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Announcement with ID "${id}" not found`);
    }

    let publishedAt = existing.publishedAt;
    if (dto.isPublished !== undefined) {
      if (dto.isPublished && !existing.isPublished) {
        publishedAt = new Date();
      } else if (!dto.isPublished) {
        publishedAt = null;
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const ann = await tx.announcement.update({
        where: { id },
        data: {
          title: dto.title !== undefined ? dto.title.trim() : undefined,
          message: dto.message !== undefined ? dto.message.trim() : undefined,
          priority: dto.priority !== undefined ? dto.priority : undefined,
          isPublished: dto.isPublished !== undefined ? dto.isPublished : undefined,
          publishedAt,
        },
        include: {
          author: { select: { fullName: true } },
        },
      });

      await tx.activityLog.create({
        data: {
          actorType: 'ADMIN',
          actorId: adminId,
          action: 'ANNOUNCEMENT_UPDATED',
          description: `Admin updated announcement "${ann.title}"`,
          metadata: { announcementId: ann.id },
        },
      });

      return ann;
    });

    return {
      id: updated.id,
      title: updated.title,
      message: updated.message,
      priority: updated.priority as AnnouncementPriority,
      isPublished: updated.isPublished,
      publishedAt: updated.publishedAt ? updated.publishedAt.toISOString() : null,
      authorName: updated.author?.fullName || 'System Admin',
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Toggle announcement publish status (Admin only)
   */
  async togglePublish(
    id: string,
    isPublished: boolean,
    adminId: string,
  ): Promise<AnnouncementItem> {
    return this.updateAnnouncement(id, { isPublished }, adminId);
  }

  /**
   * Delete an announcement (Admin only)
   */
  async deleteAnnouncement(id: string, adminId: string): Promise<{ success: boolean; message: string }> {
    const existing = await this.prisma.announcement.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Announcement with ID "${id}" not found`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.announcement.delete({ where: { id } });

      await tx.activityLog.create({
        data: {
          actorType: 'ADMIN',
          actorId: adminId,
          action: 'ANNOUNCEMENT_DELETED',
          description: `Admin deleted announcement "${existing.title}"`,
          metadata: { announcementId: id },
        },
      });
    });

    return { success: true, message: `Announcement "${existing.title}" deleted` };
  }
}
