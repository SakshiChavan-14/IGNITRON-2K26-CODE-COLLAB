import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { CompetitionModule } from './competition/competition.module';
import { CodeExecutionModule } from './code-execution/code-execution.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['../../.env', '.env'],
    }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    AdminModule,
    CompetitionModule,
    CodeExecutionModule,
  ],
})
export class AppModule {}
