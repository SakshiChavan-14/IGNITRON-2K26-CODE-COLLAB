import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import {
  AdminLoginDto,
  TeamLoginDto,
  ChangePasswordDto,
  AuthUser,
  AuthAdminUser,
  AuthTeamUser,
  TeamLookupResponse,
  RegisterTeamResponse,
  AdminJwtPayload,
  TeamJwtPayload,
  SESSION_CONFIG,
} from '@ignitron/shared';
import { PrismaService } from '../database/prisma.service';
import { RegisterTeamDto } from './dto/auth.dto';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.bootstrapAdminAccount();
  }

  /**
   * Automatically bootstrap default super administrator account if no admin accounts exist
   */
  async bootstrapAdminAccount() {
    try {
      const adminCount = await this.prisma.adminAccount.count();
      if (adminCount === 0) {
        const email =
          this.configService.get<string>('app.auth.adminEmail') ||
          'admin@ignitron.local';
        const rawPassword =
          this.configService.get<string>('app.auth.adminPassword') ||
          'Ignitron@Admin2026';
        const fullName =
          this.configService.get<string>('app.auth.adminFullName') ||
          'IGNITRON System Administrator';

        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(rawPassword, saltRounds);

        await this.prisma.adminAccount.create({
          data: {
            email,
            passwordHash,
            fullName,
            role: 'SUPER_ADMIN',
            isActive: true,
          },
        });

        this.logger.log(`Default administrator bootstrap created: ${email}`);
      }
    } catch (error) {
      this.logger.error('Failed to bootstrap default administrator account', error);
    }
  }

  /**
   * Authenticate Administrator
   */
  async adminLogin(dto: AdminLoginDto): Promise<{ user: AuthAdminUser; token: string }> {
    const admin = await this.prisma.adminAccount.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
    });

    if (!admin) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!admin.isActive) {
      throw new UnauthorizedException('This administrator account has been deactivated');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update last login timestamp
    await this.prisma.adminAccount.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    // Record activity log
    await this.prisma.activityLog.create({
      data: {
        actorType: 'ADMIN',
        actorId: admin.id,
        action: 'ADMIN_LOGIN',
        description: `Administrator ${admin.fullName} (${admin.email}) logged in`,
      },
    });

    const payload: AdminJwtPayload = {
      sub: admin.id,
      email: admin.email,
      fullName: admin.fullName,
      role: admin.role,
      type: 'ADMIN',
    };

    const token = this.jwtService.sign(payload);

    return {
      user: {
        id: admin.id,
        type: 'ADMIN',
        email: admin.email,
        fullName: admin.fullName,
        role: admin.role,
      },
      token,
    };
  }

  /**
   * Public Team Registration
   * - Exactly two participants per team
   * - Accepts personal or college email addresses
   * - Validates distinct participant emails and prevents duplicates in database
   * - Hashes password with bcrypt
   * - Sets mustChangePassword: false (team set their own password)
   */
  async registerTeam(dto: RegisterTeamDto): Promise<RegisterTeamResponse> {
    const trimmedTeamName = dto.teamName.trim();
    const trimmedInstitution = dto.institution.trim();

    if (!dto.participants || dto.participants.length !== 2) {
      throw new BadRequestException('Team registration requires exactly two participants');
    }

    const p1 = dto.participants[0];
    const p2 = dto.participants[1];

    const email1 = p1.email.trim().toLowerCase();
    const email2 = p2.email.trim().toLowerCase();

    if (email1 === email2) {
      throw new ConflictException('Participant 1 and Participant 2 must have distinct email addresses');
    }

    // Check for existing participant emails in database
    const existingP1 = await this.prisma.participant.findUnique({
      where: { email: email1 },
    });
    if (existingP1) {
      throw new ConflictException(`Participant email "${email1}" is already registered with another team`);
    }

    const existingP2 = await this.prisma.participant.findUnique({
      where: { email: email2 },
    });
    if (existingP2) {
      throw new ConflictException(`Participant email "${email2}" is already registered with another team`);
    }

    // Generate unique team code
    let teamCode = '';
    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate = `IGN-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
      const existing = await this.prisma.team.findUnique({
        where: { teamCode: candidate },
      });
      if (!existing) {
        teamCode = candidate;
        break;
      }
    }
    if (!teamCode) {
      teamCode = `IGN-${Date.now().toString().slice(-4)}`;
    }

    // Hash password with bcrypt
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Create team and participants in a transaction
    const newTeam = await this.prisma.$transaction(async (tx) => {
      const createdTeam = await tx.team.create({
        data: {
          teamCode,
          teamName: trimmedTeamName,
          institution: trimmedInstitution,
          passwordHash,
          mustChangePassword: false,
          isActive: true,
          status: 'ACTIVE',
        },
      });

      await tx.participant.createMany({
        data: [
          {
            teamId: createdTeam.id,
            fullName: p1.fullName.trim(),
            email: email1,
            phone: p1.phone?.trim() || null,
            studentId: p1.studentId?.trim() || null,
            isActive: true,
          },
          {
            teamId: createdTeam.id,
            fullName: p2.fullName.trim(),
            email: email2,
            phone: p2.phone?.trim() || null,
            studentId: p2.studentId?.trim() || null,
            isActive: true,
          },
        ],
      });

      const participants = await tx.participant.findMany({
        where: { teamId: createdTeam.id },
        orderBy: { createdAt: 'asc' },
      });

      // Record activity log
      await tx.activityLog.create({
        data: {
          actorType: 'TEAM',
          actorId: createdTeam.id,
          action: 'TEAM_REGISTERED',
          description: `Team "${trimmedTeamName}" (${teamCode}) registered from ${trimmedInstitution}`,
          metadata: {
            participantEmails: [email1, email2],
          },
        },
      });

      return {
        teamId: createdTeam.id,
        teamCode: createdTeam.teamCode,
        teamName: createdTeam.teamName,
        institution: createdTeam.institution || trimmedInstitution,
        participants: participants.map((p) => ({
          id: p.id,
          fullName: p.fullName,
          email: p.email,
          phone: p.phone,
          studentId: p.studentId,
        })),
      };
    });

    this.logger.log(`Public team registration successful: ${newTeam.teamName} [${newTeam.teamCode}]`);
    return newTeam;
  }

  /**
   * Public lookup for Team Code before logging in, to allow selecting participant
   */
  async lookupTeam(teamCode: string): Promise<TeamLookupResponse> {
    const formattedCode = teamCode.trim().toUpperCase();
    const team = await this.prisma.team.findUnique({
      where: { teamCode: formattedCode },
      include: {
        participants: {
          where: { isActive: true },
          select: {
            id: true,
            fullName: true,
            email: true,
            studentId: true,
          },
        },
      },
    });

    if (!team) {
      throw new NotFoundException(`Team with code "${formattedCode}" not found`);
    }

    if (!team.isActive) {
      throw new UnauthorizedException('This team has been deactivated');
    }

    return {
      teamId: team.id,
      teamCode: team.teamCode,
      teamName: team.teamName,
      participants: team.participants,
    };
  }

  /**
   * Authenticate Team & Participant with STRICT single-session concurrency enforcement
   */
  async teamLogin(
    dto: TeamLoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ user: AuthTeamUser; token: string }> {
    const formattedCode = dto.teamCode.trim().toUpperCase();

    const team = await this.prisma.team.findUnique({
      where: { teamCode: formattedCode },
      include: {
        participants: {
          where: { isActive: true },
        },
      },
    });

    if (!team) {
      throw new UnauthorizedException('Invalid team code or password');
    }

    if (!team.isActive) {
      throw new UnauthorizedException('This team account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, team.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid team code or password');
    }

    const selectedParticipant = team.participants.find(
      (p) => p.id === dto.participantId,
    );

    if (!selectedParticipant) {
      throw new BadRequestException('Selected participant is not registered for this team');
    }

    // =========================================================================
    // STRICT SINGLE-SESSION CONCURRENCY ENFORCEMENT
    // =========================================================================
    const activeSession = await this.prisma.teamSession.findFirst({
      where: {
        teamId: team.id,
        status: 'ACTIVE',
      },
      include: {
        participant: true,
      },
      orderBy: {
        lastActivityAt: 'desc',
      },
    });

    const now = new Date();
    const timeoutMs = SESSION_CONFIG.SESSION_TIMEOUT_MINUTES * 60 * 1000;

    if (activeSession) {
      const timeSinceLastActivity = now.getTime() - activeSession.lastActivityAt.getTime();

      if (timeSinceLastActivity > timeoutMs) {
        // Expire inactive session
        await this.prisma.teamSession.update({
          where: { id: activeSession.id },
          data: {
            status: 'EXPIRED',
            terminationReason: 'TIMEOUT',
            logoutAt: now,
          },
        });
      } else if (activeSession.participantId !== selectedParticipant.id) {
        // ANOTHER PARTICIPANT IS CURRENTLY LOGGED IN -> 409 CONFLICT
        const activeName = activeSession.participant.fullName;
        throw new ConflictException(
          `Cannot log in: Participant "${activeName}" currently holds the active session for team ${team.teamName}. Only ONE active participant session is permitted at any moment.`,
        );
      } else {
        // Same participant reconnecting or logging in from another tab/browser -> Displace old session cleanly
        await this.prisma.teamSession.update({
          where: { id: activeSession.id },
          data: {
            status: 'ENDED',
            terminationReason: 'DISPLACED',
            logoutAt: now,
          },
        });
      }
    }

    // Create fresh active session
    const newSession = await this.prisma.teamSession.create({
      data: {
        teamId: team.id,
        participantId: selectedParticipant.id,
        status: 'ACTIVE',
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        loginAt: now,
        lastActivityAt: now,
      },
    });

    // Update team last login
    await this.prisma.team.update({
      where: { id: team.id },
      data: { lastLoginAt: now },
    });

    // Record activity log
    await this.prisma.activityLog.create({
      data: {
        actorType: 'TEAM',
        actorId: team.id,
        action: 'TEAM_LOGIN',
        description: `Team ${team.teamName} logged in with active participant ${selectedParticipant.fullName}`,
        metadata: {
          sessionId: newSession.id,
          participantId: selectedParticipant.id,
          ip: ipAddress,
        },
      },
    });

    const payload: TeamJwtPayload = {
      sub: team.id,
      teamCode: team.teamCode,
      teamName: team.teamName,
      participantId: selectedParticipant.id,
      participantName: selectedParticipant.fullName,
      sessionId: newSession.id,
      type: 'TEAM',
    };

    const token = this.jwtService.sign(payload);

    return {
      user: {
        id: team.id,
        type: 'TEAM',
        teamCode: team.teamCode,
        teamName: team.teamName,
        institution: team.institution,
        mustChangePassword: team.mustChangePassword,
        sessionId: newSession.id,
        activeParticipant: {
          id: selectedParticipant.id,
          fullName: selectedParticipant.fullName,
          email: selectedParticipant.email,
          studentId: selectedParticipant.studentId,
        },
      },
      token,
    };
  }

  /**
   * Log out currently authenticated session
   */
  async logout(user: AuthUser): Promise<{ message: string }> {
    if (user.type === 'TEAM') {
      const teamUser = user as AuthTeamUser;
      if (teamUser.sessionId) {
        await this.prisma.teamSession.updateMany({
          where: {
            id: teamUser.sessionId,
            status: 'ACTIVE',
          },
          data: {
            status: 'ENDED',
            terminationReason: 'USER_LOGOUT',
            logoutAt: new Date(),
          },
        });

        await this.prisma.activityLog.create({
          data: {
            actorType: 'TEAM',
            actorId: teamUser.id,
            action: 'TEAM_LOGOUT',
            description: `Team ${teamUser.teamName} participant ${teamUser.activeParticipant.fullName} logged out`,
            metadata: { sessionId: teamUser.sessionId },
          },
        });
      }
    } else if (user.type === 'ADMIN') {
      await this.prisma.activityLog.create({
        data: {
          actorType: 'ADMIN',
          actorId: user.id,
          action: 'ADMIN_LOGOUT',
          description: `Administrator ${user.fullName} logged out`,
        },
      });
    }

    return { message: 'Logged out successfully' };
  }

  /**
   * Heartbeat to extend active session
   */
  async heartbeat(user: AuthUser): Promise<{ status: string; lastActivityAt: string }> {
    if (user.type === 'TEAM') {
      const teamUser = user as AuthTeamUser;
      const session = await this.prisma.teamSession.findUnique({
        where: { id: teamUser.sessionId },
      });

      if (!session || session.status !== 'ACTIVE') {
        throw new UnauthorizedException(
          'Your session has been terminated or expired by administrator',
        );
      }

      const now = new Date();
      await this.prisma.teamSession.update({
        where: { id: teamUser.sessionId },
        data: { lastActivityAt: now },
      });

      return { status: 'ok', lastActivityAt: now.toISOString() };
    }

    return { status: 'ok', lastActivityAt: new Date().toISOString() };
  }

  /**
   * Change Password (for Admin or Team forced change)
   */
  async changePassword(
    user: AuthUser,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    if (dto.newPassword.length < SESSION_CONFIG.MIN_PASSWORD_LENGTH) {
      throw new BadRequestException(
        `Password must be at least ${SESSION_CONFIG.MIN_PASSWORD_LENGTH} characters long`,
      );
    }

    const saltRounds = 10;
    const newHash = await bcrypt.hash(dto.newPassword, saltRounds);

    if (user.type === 'ADMIN') {
      const admin = await this.prisma.adminAccount.findUnique({
        where: { id: user.id },
      });
      if (!admin) {
        throw new NotFoundException('Administrator account not found');
      }

      const validOld = await bcrypt.compare(dto.currentPassword, admin.passwordHash);
      if (!validOld) {
        throw new BadRequestException('Current password does not match');
      }

      await this.prisma.adminAccount.update({
        where: { id: admin.id },
        data: { passwordHash: newHash },
      });

      await this.prisma.activityLog.create({
        data: {
          actorType: 'ADMIN',
          actorId: admin.id,
          action: 'ADMIN_PASSWORD_CHANGED',
          description: `Admin ${admin.fullName} changed password`,
        },
      });
    } else if (user.type === 'TEAM') {
      const team = await this.prisma.team.findUnique({
        where: { id: user.id },
      });
      if (!team) {
        throw new NotFoundException('Team account not found');
      }

      const validOld = await bcrypt.compare(dto.currentPassword, team.passwordHash);
      if (!validOld) {
        throw new BadRequestException('Current password does not match');
      }

      await this.prisma.team.update({
        where: { id: team.id },
        data: {
          passwordHash: newHash,
          mustChangePassword: false,
        },
      });

      await this.prisma.activityLog.create({
        data: {
          actorType: 'TEAM',
          actorId: team.id,
          action: 'TEAM_PASSWORD_CHANGED',
          description: `Team ${team.teamName} updated their password`,
        },
      });
    }

    return { message: 'Password updated successfully' };
  }
}
