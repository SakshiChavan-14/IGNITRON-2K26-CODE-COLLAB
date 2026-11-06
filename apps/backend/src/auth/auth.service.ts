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
import {
  AdminLoginDto,
  TeamLoginDto,
  ChangePasswordDto,
  AuthUser,
  AuthAdminUser,
  AuthTeamUser,
  TeamLookupResponse,
  AdminJwtPayload,
  TeamJwtPayload,
  SESSION_CONFIG,
} from '@ignitron/shared';
import { PrismaService } from '../database/prisma.service';

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
