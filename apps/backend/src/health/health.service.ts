import { Injectable } from '@nestjs/common';
import { HealthResponse, ReadinessResponse, APPLICATION_METADATA } from '@ignitron/shared';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class HealthService {
  private readonly startupTime = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  getHealth(): HealthResponse {
    return {
      status: 'ok',
      application: APPLICATION_METADATA.name,
      service: 'backend',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startupTime) / 1000),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  async getReadiness(): Promise<{ isReady: boolean; response: ReadinessResponse }> {
    const isDbConnected = await this.prisma.ping();

    const response: ReadinessResponse = {
      status: isDbConnected ? 'ready' : 'not_ready',
      application: APPLICATION_METADATA.name,
      service: 'backend',
      timestamp: new Date().toISOString(),
      checks: {
        api: 'ok',
        database: isDbConnected ? 'connected' : 'disconnected',
      },
    };

    return {
      isReady: isDbConnected,
      response,
    };
  }
}
