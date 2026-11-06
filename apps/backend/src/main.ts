import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') || 4000;
  const apiPrefix = configService.get<string>('app.apiPrefix') || 'api';

  // Global API route prefix
  app.setGlobalPrefix(apiPrefix);

  // Cookie parser middleware for HttpOnly JWT session tokens
  app.use(cookieParser());

  // CORS configuration for local development
  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Global request validation pipeline
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter and request logging interceptor
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  await app.listen(port);
  logger.log(`====================================================`);
  logger.log(`IGNITRON 2K26 Backend Server running`);
  logger.log(`Environment: ${configService.get<string>('app.nodeEnv')}`);
  logger.log(`Base URL:    http://localhost:${port}/${apiPrefix}`);
  logger.log(`Health API:  http://localhost:${port}/${apiPrefix}/health`);
  logger.log(`====================================================`);
}

bootstrap().catch((err) => {
  console.error('Fatal error during backend bootstrapping:', err);
  process.exit(1);
});

