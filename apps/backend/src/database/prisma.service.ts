import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private isConnected = false;

  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['warn', 'error']
          : ['error'],
    });
  }

  async onModuleInit(): Promise<void> {
    // Attempt non-blocking initial connection probe so backend bootstrap is never stalled
    void this.probeInitialConnection();
  }

  private async probeInitialConnection(): Promise<void> {
    try {
      await Promise.race([
        this.$connect(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Connection timeout (3s)')), 3000),
        ),
      ]);
      this.isConnected = true;
      this.logger.log('Database connection established successfully.');
    } catch (error) {
      this.isConnected = false;
      const message =
        error instanceof Error ? error.message : 'Database unreachable';
      this.logger.warn(
        `Initial database connection unavailable: ${message}. Operating in offline/degraded mode until database is reachable.`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.$disconnect();
      this.isConnected = false;
      this.logger.log('Database connection disconnected cleanly.');
    } catch (error) {
      this.logger.error('Error during database disconnection:', error);
    }
  }

  /**
   * Probes active connectivity to the MySQL database instance.
   * Enforces a 2.5s timeout and catches errors cleanly without throwing.
   */
  async ping(): Promise<boolean> {
    try {
      await Promise.race([
        this.$queryRaw`SELECT 1`,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Query timeout')), 2500),
        ),
      ]);
      this.isConnected = true;
      return true;
    } catch {
      this.isConnected = false;
      return false;
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}
