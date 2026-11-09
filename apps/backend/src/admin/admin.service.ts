import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { parse } from 'csv-parse/sync';
import {
  TeamStatus,
  DashboardStatsDto,
  TeamListItem,
  TeamCredentials,
  CsvImportPreviewResponse,
  CsvRowValidation,
  CsvImportConfirmResult,
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
      compState,
    ] = await Promise.all([
      this.prisma.team.count(),
      this.prisma.team.count({ where: { isActive: true } }),
      this.prisma.team.count({ where: { isActive: false } }),
      this.prisma.participant.count(),
      this.prisma.teamSession.count({
        where: { status: 'ACTIVE' },
      }),
      this.prisma.competitionState.findUnique({
        where: { id: 'global' },
      }),
    ]);

    return {
      totalTeams,
      activeTeams,
      inactiveTeams,
      totalParticipants,
      teamsWithActiveSessions,
      currentCompetitionStatus: compState?.status || 'STANDBY',
      currentRoundNumber: compState?.currentRoundNumber || null,
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

  /**
   * Preview and validate CSV content for bulk import with dynamic column mapping
   */
  async previewCsv(
    csvContent: string,
    customMapping?: Record<string, string>,
  ): Promise<CsvImportPreviewResponse> {
    if (!csvContent || csvContent.trim().length === 0) {
      throw new BadRequestException('CSV file content is empty');
    }

    let records: Record<string, string>[];
    try {
      records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (parseError: any) {
      throw new BadRequestException(
        `Failed to parse CSV: ${parseError.message || 'Invalid format'}`,
      );
    }

    if (records.length === 0) {
      throw new BadRequestException('No data rows found in CSV');
    }

    const headers = Object.keys(records[0]);

    // Helper to find mapped header name
    const findHeader = (patterns: string[], explicitKey?: string): string | null => {
      if (explicitKey && headers.includes(explicitKey)) {
        return explicitKey;
      }
      for (const p of patterns) {
        const found = headers.find((h) => h.toLowerCase() === p.toLowerCase());
        if (found) return found;
      }
      for (const p of patterns) {
        const found = headers.find((h) =>
          h.toLowerCase().replace(/[^a-z0-9]/g, '').includes(p.toLowerCase().replace(/[^a-z0-9]/g, '')),
        );
        if (found) return found;
      }
      return null;
    };

    const teamNameCol = findHeader(['team name', 'team_name', 'team', 'teamname'], customMapping?.teamNameColumn);
    const teamCodeCol = findHeader(['team code', 'team_code', 'code', 'teamcode'], customMapping?.teamCodeColumn);
    const institutionCol = findHeader(['institution', 'college', 'university', 'organization'], customMapping?.institutionColumn);

    const p1NameCol = findHeader(['participant 1 name', 'participant1 name', 'p1 name', 'leader name', 'p1_name', 'member 1 name'], customMapping?.p1NameColumn);
    const p1EmailCol = findHeader(['participant 1 email', 'participant1 email', 'p1 email', 'leader email', 'p1_email', 'member 1 email'], customMapping?.p1EmailColumn);
    const p1PhoneCol = findHeader(['participant 1 phone', 'p1 phone', 'leader phone', 'p1_phone'], customMapping?.p1PhoneColumn);
    const p1StudentIdCol = findHeader(['participant 1 student id', 'p1 student id', 'leader roll', 'p1_student_id'], customMapping?.p1StudentIdColumn);

    const p2NameCol = findHeader(['participant 2 name', 'participant2 name', 'p2 name', 'member name', 'p2_name', 'member 2 name'], customMapping?.p2NameColumn);
    const p2EmailCol = findHeader(['participant 2 email', 'participant2 email', 'p2 email', 'member email', 'p2_email', 'member 2 email'], customMapping?.p2EmailColumn);
    const p2PhoneCol = findHeader(['participant 2 phone', 'p2 phone', 'member phone', 'p2_phone'], customMapping?.p2PhoneColumn);
    const p2StudentIdCol = findHeader(['participant 2 student id', 'p2 student id', 'member roll', 'p2_student_id'], customMapping?.p2StudentIdColumn);

    // Existing codes and emails in DB
    const existingTeams = await this.prisma.team.findMany({ select: { teamCode: true } });
    const existingParticipants = await this.prisma.participant.findMany({ select: { email: true } });

    const existingCodesSet = new Set(existingTeams.map((t) => t.teamCode.toUpperCase()));
    const existingEmailsSet = new Set(existingParticipants.map((p) => p.email.toLowerCase()));

    const seenCodesInCsv = new Set<string>();
    const seenEmailsInCsv = new Set<string>();

    const rows: CsvRowValidation[] = [];
    let validCount = 0;
    let invalidCount = 0;
    let duplicateCodesCount = 0;
    let duplicateEmailsCount = 0;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const errors: string[] = [];

      const teamName = teamNameCol ? (row[teamNameCol] || '').trim() : '';
      let teamCode = teamCodeCol ? (row[teamCodeCol] || '').trim().toUpperCase() : '';
      const institution = institutionCol ? (row[institutionCol] || '').trim() : '';

      const p1Name = p1NameCol ? (row[p1NameCol] || '').trim() : '';
      const p1Email = p1EmailCol ? (row[p1EmailCol] || '').trim().toLowerCase() : '';
      const p1Phone = p1PhoneCol ? (row[p1PhoneCol] || '').trim() : '';
      const p1StudentId = p1StudentIdCol ? (row[p1StudentIdCol] || '').trim() : '';

      const p2Name = p2NameCol ? (row[p2NameCol] || '').trim() : '';
      const p2Email = p2EmailCol ? (row[p2EmailCol] || '').trim().toLowerCase() : '';
      const p2Phone = p2PhoneCol ? (row[p2PhoneCol] || '').trim() : '';
      const p2StudentId = p2StudentIdCol ? (row[p2StudentIdCol] || '').trim() : '';

      // Validation
      if (!teamName) {
        errors.push('Team name is missing');
      }

      if (!p1Name) errors.push('Participant 1 name is missing');
      if (!p1Email) {
        errors.push('Participant 1 email is missing');
      } else if (!emailRegex.test(p1Email)) {
        errors.push('Participant 1 email format is invalid');
      }

      if (!p2Name) errors.push('Participant 2 name is missing');
      if (!p2Email) {
        errors.push('Participant 2 email is missing');
      } else if (!emailRegex.test(p2Email)) {
        errors.push('Participant 2 email format is invalid');
      }

      if (p1Email && p2Email && p1Email === p2Email) {
        errors.push('Participant 1 and Participant 2 cannot have the same email');
        duplicateEmailsCount++;
      }

      if (p1Email) {
        if (seenEmailsInCsv.has(p1Email)) {
          errors.push(`Participant 1 email "${p1Email}" appears multiple times in CSV`);
          duplicateEmailsCount++;
        } else if (existingEmailsSet.has(p1Email)) {
          errors.push(`Participant 1 email "${p1Email}" already registered in database`);
          duplicateEmailsCount++;
        }
        seenEmailsInCsv.add(p1Email);
      }

      if (p2Email) {
        if (seenEmailsInCsv.has(p2Email)) {
          errors.push(`Participant 2 email "${p2Email}" appears multiple times in CSV`);
          duplicateEmailsCount++;
        } else if (existingEmailsSet.has(p2Email)) {
          errors.push(`Participant 2 email "${p2Email}" already registered in database`);
          duplicateEmailsCount++;
        }
        seenEmailsInCsv.add(p2Email);
      }

      if (teamCode) {
        if (seenCodesInCsv.has(teamCode)) {
          errors.push(`Team code "${teamCode}" appears multiple times in CSV`);
          duplicateCodesCount++;
        } else if (existingCodesSet.has(teamCode)) {
          errors.push(`Team code "${teamCode}" already exists in database`);
          duplicateCodesCount++;
        }
        seenCodesInCsv.add(teamCode);
      }

      const isValid = errors.length === 0;
      if (isValid) {
        validCount++;
      } else {
        invalidCount++;
      }

      rows.push({
        rowIndex: i + 1,
        rawRow: row,
        isValid,
        errors,
        mappedData: isValid
          ? {
              teamCode: teamCode || `IGN-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
              teamName,
              institution,
              participant1: { fullName: p1Name, email: p1Email, phone: p1Phone, studentId: p1StudentId },
              participant2: { fullName: p2Name, email: p2Email, phone: p2Phone, studentId: p2StudentId },
            }
          : undefined,
      });
    }

    return {
      totalRows: records.length,
      validCount,
      invalidCount,
      duplicateCodesCount,
      duplicateEmailsCount,
      rows,
      headers,
    };
  }

  /**
   * Confirm and execute database transaction for bulk import
   */
  async confirmCsvImport(
    validRows: Array<{
      teamCode: string;
      teamName: string;
      institution?: string;
      participant1: { fullName: string; email: string; phone?: string; studentId?: string };
      participant2: { fullName: string; email: string; phone?: string; studentId?: string };
    }>,
    adminId: string,
  ): Promise<CsvImportConfirmResult> {
    if (!validRows || validRows.length === 0) {
      throw new BadRequestException('No valid records provided for import');
    }

    const saltRounds = 10;
    const generatedCredentials: TeamCredentials[] = [];

    // Pre-generate credentials and hashes
    const preparedTeams = await Promise.all(
      validRows.map(async (row) => {
        const temporaryPassword = this.generateRandomPassword(10);
        const passwordHash = await bcrypt.hash(temporaryPassword, saltRounds);
        return {
          row,
          temporaryPassword,
          passwordHash,
        };
      }),
    );

    const activityLog = await this.prisma.$transaction(async (tx) => {
      for (const item of preparedTeams) {
        const { row, temporaryPassword, passwordHash } = item;
        const createdTeam = await tx.team.create({
          data: {
            teamCode: row.teamCode.toUpperCase(),
            teamName: row.teamName,
            institution: row.institution || null,
            passwordHash,
            mustChangePassword: true,
            isActive: true,
            participants: {
              create: [
                {
                  fullName: row.participant1.fullName,
                  email: row.participant1.email.toLowerCase(),
                  phone: row.participant1.phone || null,
                  studentId: row.participant1.studentId || null,
                },
                {
                  fullName: row.participant2.fullName,
                  email: row.participant2.email.toLowerCase(),
                  phone: row.participant2.phone || null,
                  studentId: row.participant2.studentId || null,
                },
              ],
            },
          },
        });

        generatedCredentials.push({
          teamId: createdTeam.id,
          teamCode: createdTeam.teamCode,
          teamName: createdTeam.teamName,
          temporaryPassword,
          generatedAt: new Date().toISOString(),
        });
      }

      return await tx.activityLog.create({
        data: {
          actorType: 'ADMIN',
          actorId: adminId,
          action: 'TEAMS_BULK_IMPORTED',
          description: `Admin imported ${preparedTeams.length} teams via CSV`,
          metadata: {
            importedCount: preparedTeams.length,
            teamCodes: preparedTeams.map((p) => p.row.teamCode),
          },
        },
      });
    });

    return {
      importedCount: preparedTeams.length,
      generatedCredentials,
      activityLogId: activityLog.id,
    };
  }
}
