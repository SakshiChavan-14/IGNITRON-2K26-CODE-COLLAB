import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { HealthService } from './health.service';
import { HealthResponse, ReadinessResponse } from '@ignitron/shared';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  getHealth(): HealthResponse {
    return this.healthService.getHealth();
  }

  @Get('ready')
  async getReadiness(
    @Res({ passthrough: true }) res: Response,
  ): Promise<ReadinessResponse> {
    const { isReady, response } = await this.healthService.getReadiness();
    res.status(isReady ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    return response;
  }
}
