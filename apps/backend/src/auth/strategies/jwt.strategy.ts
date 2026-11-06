import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload } from '@ignitron/shared';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const jwtSecret =
      configService.get<string>('app.auth.jwtSecret') ||
      'ignitron-2k26-secret-development-key-change-in-production';

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          let token = null;
          if (request && request.cookies) {
            token = request.cookies['ignitron_session'];
          }
          if (!token && request && request.headers.authorization) {
            const parts = request.headers.authorization.split(' ');
            if (parts.length === 2 && parts[0] === 'Bearer') {
              token = parts[1];
            }
          }
          return token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload || !payload.sub || !payload.type) {
      throw new UnauthorizedException('Invalid authentication token payload');
    }

    if (payload.type === 'ADMIN') {
      const admin = await this.prisma.adminAccount.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
        },
      });

      if (!admin || !admin.isActive) {
        throw new UnauthorizedException('Admin account is inactive or not found');
      }

      return {
        id: admin.id,
        type: 'ADMIN' as const,
        email: admin.email,
        fullName: admin.fullName,
        role: admin.role,
      };
    }

    if (payload.type === 'TEAM') {
      const team = await this.prisma.team.findUnique({
        where: { id: payload.sub },
        include: {
          participants: {
            where: { id: payload.participantId, isActive: true },
          },
        },
      });

      if (!team || !team.isActive) {
        throw new UnauthorizedException('Team account is inactive or not found');
      }

      const participant = team.participants[0];
      if (!participant) {
        throw new UnauthorizedException('Selected participant is inactive or not found');
      }

      // Check if session is still ACTIVE
      const session = await this.prisma.teamSession.findUnique({
        where: { id: payload.sessionId },
      });

      if (!session || session.status !== 'ACTIVE') {
        throw new UnauthorizedException(
          'Your session has ended, expired, or was revoked by administrator',
        );
      }

      return {
        id: team.id,
        type: 'TEAM' as const,
        teamCode: team.teamCode,
        teamName: team.teamName,
        institution: team.institution,
        mustChangePassword: team.mustChangePassword,
        sessionId: session.id,
        activeParticipant: {
          id: participant.id,
          fullName: participant.fullName,
          email: participant.email,
          studentId: participant.studentId,
        },
      };
    }

    throw new UnauthorizedException('Unknown account type');
  }
}
