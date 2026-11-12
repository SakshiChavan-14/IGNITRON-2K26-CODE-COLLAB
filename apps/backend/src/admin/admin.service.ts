import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import {
  TeamStatus,
  DashboardStatsDto,
  TeamListItem,
  TeamCredentials,
} from '@ignitron/shared';
import { PrismaService } from '../database/prisma.service';
import {
  CreateTeamDto,
  UpdateTeamDto,
  ToggleTeamStatusDto,
} from './dto/admin-teams.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Secure random password generator
   */
  generateRandomPassword(length = 10): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let result = '';
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      result += chars[bytes[i] % chars.length];
    }
    return result;
  }

  /**
   * Generate unique team code if not specified
   */
  async generateUniqueTeamCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = `IGN-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
      const existing = await this.prisma.team.findUnique({
        where: { teamCode: code },
      });
      if (!existing) {
        return code;
      }
    }
    return `IGN-${Date.now().toString().slice(-4)}`;
  }

  /**
   * Get Admin Dashboard overview statistics
   */
  async getDashboardStats(): Promise<DashboardStatsDto> {
    const [
      totalTeams,
      activeTeams,
      inactiveTeams,
      totalParticipants,
      teamsWithActiveSessions,
      unparticipatedTeams,
      compState,
      recentTeamsRaw,
      recentLoginsRaw,
    ] = await Promise.all([
      this.prisma.team.count(),
      this.prisma.team.count({ where: { isActive: true } }),
      this.prisma.team.count({ where: { isActive: false } }),
      this.prisma.participant.count(),
      this.prisma.teamSession.count({
        where: { status: 'ACTIVE' },
      }),
      this.prisma.team.count({
        where: { lastLoginAt: null },
      }),
      this.prisma.competitionState.findUnique({
        where: { id: 'global' },
      }),
      this.prisma.team.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          participants: {
            select: { fullName: true, email: true },
          },
        },
      }),
      this.prisma.teamSession.findMany({
        orderBy: { loginAt: 'desc' },
        take: 6,
        include: {
          team: { select: { teamCode: true, teamName: true } },
          participant: { select: { fullName: true } },
        },
      }),
    ]);

    const recentRegistrations = recentTeamsRaw.map((t) => ({
      id: t.id,
      teamCode: t.teamCode,
      teamName: t.teamName,
      institution: t.institution,
      createdAt: t.createdAt.toISOString(),
      participants: t.participants,
    }));

    const recentLogins = recentLoginsRaw.map((s) => ({
      id: s.id,
      teamId: s.teamId,
      teamCode: s.team.teamCode,
      teamName: s.team.teamName,
      participantName: s.participant.fullName,
      loginAt: s.loginAt.toISOString(),
      status: s.status,
    }));

    return {
      totalTeams,
      activeTeams,
      inactiveTeams,
      totalParticipants,
      teamsWithActiveSessions,
      unparticipatedTeams,
      currentCompetitionStatus: compState?.status || 'STANDBY',
      currentRoundNumber: compState?.currentRoundNumber || null,
      recentRegistrations,
      recentLogins,
    };
  }

  /**
   * List teams with search, filtering, participants, and live active session status
   */
  async getTeams(search?: string, status?: string): Promise<TeamListItem[]> {
    const where: any = {};

    if (status && ['ACTIVE', 'DISQUALIFIED', 'WITHDRAWN'].includes(status)) {
      where.status = status as TeamStatus;
    }

    if (search && search.trim().length > 0) {
      const q = search.trim();
      where.OR = [
        { teamCode: { contains: q } },
        { teamName: { contains: q } },
        { institution: { contains: q } },
        {
          participants: {
            some: {
              OR: [
                { fullName: { contains: q } },
                { email: { contains: q } },
                { studentId: { contains: q } },
              ],
            },
          },
        },
      ];
    }

    const teams = await this.prisma.team.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        participants: {
          orderBy: { createdAt: 'asc' },
        },
        sessions: {
          where: { status: 'ACTIVE' },
          include: { participant: true },
          take: 1,
        },
      },
    });

    return teams.map((team) => {
      const activeSession = team.sessions[0];
      return {
        id: team.id,
        teamCode: team.teamCode,
        teamName: team.teamName,
        institution: team.institution,
        isActive: team.isActive,
        isDemo: team.isDemo,
        status: team.status as TeamStatus,
        mustChangePassword: team.mustChangePassword,
        lastLoginAt: team.lastLoginAt ? team.lastLoginAt.toISOString() : null,
        createdAt: team.createdAt.toISOString(),
        participants: team.participants.map((p) => ({
          id: p.id,
          fullName: p.fullName,
          email: p.email,
          phone: p.phone,
          studentId: p.studentId,
          isActive: p.isActive,
        })),
        activeSession: activeSession
          ? {
              id: activeSession.id,
              participantId: activeSession.participantId,
              participantName: activeSession.participant.fullName,
              loginAt: activeSession.loginAt.toISOString(),
              lastActivityAt: activeSession.lastActivityAt.toISOString(),
            }
          : null,
      };
    });
  }

  /**
   * Export all teams and participants roster as CSV
   */
  async exportTeamsCsv(): Promise<string> {
    const teams = await this.getTeams();
    const headers = [
      'Team Code',
      'Team Name',
      'Institution',
      'Status',
      'Is Active',
      'Registered At',
      'Last Login At',
      'Active Participant Session',
      'Participant 1 Name',
      'Participant 1 Email',
      'Participant 1 Phone',
      'Participant 1 Student ID',
      'Participant 2 Name',
      'Participant 2 Email',
      'Participant 2 Phone',
      'Participant 2 Student ID',
    ];

    const escapeCsv = (val: any): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = teams.map((t) => [
      escapeCsv(t.teamCode),
      escapeCsv(t.teamName),
      escapeCsv(t.institution),
      escapeCsv(t.status),
      t.isActive ? 'Active' : 'Inactive',
      escapeCsv(t.createdAt),
      escapeCsv(t.lastLoginAt),
      escapeCsv(t.activeSession?.participantName || 'None'),
      escapeCsv(t.participants[0]?.fullName),
      escapeCsv(t.participants[0]?.email),
      escapeCsv(t.participants[0]?.phone),
      escapeCsv(t.participants[0]?.studentId),
      escapeCsv(t.participants[1]?.fullName),
      escapeCsv(t.participants[1]?.email),
      escapeCsv(t.participants[1]?.phone),
      escapeCsv(t.participants[1]?.studentId),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  }


  /**
   * Get team details with participants and session history
   */
  async getTeamById(id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: {
        participants: true,
        sessions: {
          include: { participant: true },
          orderBy: { loginAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!team) {
      throw new NotFoundException(`Team with ID ${id} not found`);
    }

    return team;
  }

  /**
   * Create a single team manually
   */
  async createTeam(
    dto: CreateTeamDto,
    adminId: string,
  ): Promise<{ team: TeamListItem; credentials: TeamCredentials }> {
    // Validate that participant emails are distinct
    const [p1, p2] = dto.participants;
    if (p1.email.trim().toLowerCase() === p2.email.trim().toLowerCase()) {
      throw new BadRequestException('The two participants cannot have the same email address');
    }

    // Check existing participant emails
    const existingParticipants = await this.prisma.participant.findMany({
      where: {
        email: {
          in: [p1.email.trim().toLowerCase(), p2.email.trim().toLowerCase()],
        },
      },
    });

    if (existingParticipants.length > 0) {
      const duplicateEmails = existingParticipants.map((p) => p.email).join(', ');
      throw new ConflictException(
        `Participant email(s) already registered: ${duplicateEmails}`,
      );
    }

    // Determine team code
    let teamCode = dto.teamCode?.trim().toUpperCase();
    if (!teamCode) {
      teamCode = await this.generateUniqueTeamCode();
    } else {
      const existingTeam = await this.prisma.team.findUnique({
        where: { teamCode },
      });
      if (existingTeam) {
        throw new ConflictException(`Team code "${teamCode}" is already in use`);
      }
    }

    // Generate temporary password
    const temporaryPassword = this.generateRandomPassword(10);
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(temporaryPassword, saltRounds);

    const newTeam = await this.prisma.$transaction(async (tx) => {
      const createdTeam = await tx.team.create({
        data: {
          teamCode,
          teamName: dto.teamName.trim(),
          institution: dto.institution?.trim() || null,
          passwordHash,
          mustChangePassword: true,
          isActive: true,
          participants: {
            create: [
              {
                fullName: p1.fullName.trim(),
                email: p1.email.trim().toLowerCase(),
                phone: p1.phone?.trim() || null,
                studentId: p1.studentId?.trim() || null,
              },
              {
                fullName: p2.fullName.trim(),
                email: p2.email.trim().toLowerCase(),
                phone: p2.phone?.trim() || null,
                studentId: p2.studentId?.trim() || null,
              },
            ],
          },
        },
        include: {
          participants: true,
        },
      });

      await tx.activityLog.create({
        data: {
          actorType: 'ADMIN',
          actorId: adminId,
          action: 'TEAM_CREATED',
          description: `Admin created team "${createdTeam.teamName}" (${createdTeam.teamCode})`,
          metadata: { teamId: createdTeam.id, teamCode: createdTeam.teamCode },
        },
      });

      return createdTeam;
    });

    const credentials: TeamCredentials = {
      teamId: newTeam.id,
      teamCode: newTeam.teamCode,
      teamName: newTeam.teamName,
      temporaryPassword,
      generatedAt: new Date().toISOString(),
    };

    const teamListItem: TeamListItem = {
      id: newTeam.id,
      teamCode: newTeam.teamCode,
      teamName: newTeam.teamName,
      institution: newTeam.institution,
      isActive: newTeam.isActive,
      isDemo: newTeam.isDemo,
      status: newTeam.status as TeamStatus,
      mustChangePassword: newTeam.mustChangePassword,
      lastLoginAt: null,
      createdAt: newTeam.createdAt.toISOString(),
      participants: newTeam.participants.map((p) => ({
        id: p.id,
        fullName: p.fullName,
        email: p.email,
        phone: p.phone,
        studentId: p.studentId,
        isActive: p.isActive,
      })),
      activeSession: null,
    };

    return { team: teamListItem, credentials };
  }

  /**
   * Update an existing team and its participants
   */
  async updateTeam(id: string, dto: UpdateTeamDto, adminId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: { participants: true },
    });

    if (!team) {
      throw new NotFoundException(`Team with ID ${id} not found`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.team.update({
        where: { id },
        data: {
          teamName: dto.teamName !== undefined ? dto.teamName.trim() : undefined,
          institution: dto.institution !== undefined ? dto.institution.trim() : undefined,
          isActive: dto.isActive !== undefined ? dto.isActive : undefined,
          status: dto.status !== undefined ? dto.status : undefined,
        },
      });

      if (dto.participants && dto.participants.length > 0) {
        for (const p of dto.participants) {
          if (p.id) {
            await tx.participant.update({
              where: { id: p.id },
              data: {
                fullName: p.fullName.trim(),
                email: p.email.trim().toLowerCase(),
                phone: p.phone?.trim() || null,
                studentId: p.studentId?.trim() || null,
              },
            });
          }
        }
      }

      await tx.activityLog.create({
        data: {
          actorType: 'ADMIN',
          actorId: adminId,
          action: 'TEAM_UPDATED',
          description: `Admin updated team "${team.teamName}" (${team.teamCode})`,
          metadata: { teamId: team.id },
        },
      });
    });

    return this.getTeamById(id);
  }

  /**
   * Activate or deactivate a team
   */
  async toggleTeamStatus(id: string, dto: ToggleTeamStatusDto, adminId: string) {
    const team = await this.prisma.team.findUnique({ where: { id } });
    if (!team) {
      throw new NotFoundException(`Team with ID ${id} not found`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.team.update({
        where: { id },
        data: { isActive: dto.isActive },
      });

      if (!dto.isActive) {
        // Revoke active session if team is deactivated
        await tx.teamSession.updateMany({
          where: { teamId: id, status: 'ACTIVE' },
          data: {
            status: 'REVOKED',
            terminationReason: 'ADMIN_REVOKED',
            logoutAt: new Date(),
          },
        });
      }

      await tx.activityLog.create({
        data: {
          actorType: 'ADMIN',
          actorId: adminId,
          action: dto.isActive ? 'TEAM_ACTIVATED' : 'TEAM_DEACTIVATED',
          description: `Admin ${dto.isActive ? 'activated' : 'deactivated'} team "${team.teamName}"`,
          metadata: { teamId: team.id, isActive: dto.isActive },
        },
      });
    });

    return { message: `Team successfully ${dto.isActive ? 'activated' : 'deactivated'}` };
  }

  /**
   * Reset team password with forced password change
   */
  async resetTeamPassword(id: string, adminId: string): Promise<TeamCredentials> {
    const team = await this.prisma.team.findUnique({ where: { id } });
    if (!team) {
      throw new NotFoundException(`Team with ID ${id} not found`);
    }

    const temporaryPassword = this.generateRandomPassword(10);
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(temporaryPassword, saltRounds);

    await this.prisma.$transaction(async (tx) => {
      await tx.team.update({
        where: { id },
        data: {
          passwordHash,
          mustChangePassword: true,
        },
      });

      // Revoke any active sessions
      await tx.teamSession.updateMany({
        where: { teamId: id, status: 'ACTIVE' },
        data: {
          status: 'REVOKED',
          terminationReason: 'ADMIN_REVOKED',
          logoutAt: new Date(),
        },
      });

      await tx.activityLog.create({
        data: {
          actorType: 'ADMIN',
          actorId: adminId,
          action: 'TEAM_PASSWORD_RESET',
          description: `Admin reset password for team "${team.teamName}" (${team.teamCode})`,
          metadata: { teamId: team.id },
        },
      });
    });

    return {
      teamId: team.id,
      teamCode: team.teamCode,
      teamName: team.teamName,
      temporaryPassword,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Revoke active team participant session
   */
  async revokeActiveSession(teamId: string, adminId: string) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      throw new NotFoundException(`Team with ID ${teamId} not found`);
    }

    const updated = await this.prisma.teamSession.updateMany({
      where: { teamId, status: 'ACTIVE' },
      data: {
        status: 'REVOKED',
        terminationReason: 'ADMIN_REVOKED',
        logoutAt: new Date(),
      },
    });

    await this.prisma.activityLog.create({
      data: {
        actorType: 'ADMIN',
        actorId: adminId,
        action: 'SESSION_REVOKED',
        description: `Admin revoked active session for team "${team.teamName}" (${team.teamCode})`,
        metadata: { teamId, sessionsRevoked: updated.count },
      },
    });

    return {
      message: `Active session revoked successfully`,
      sessionsRevoked: updated.count,
    };
  }
}
