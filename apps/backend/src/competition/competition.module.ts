import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { CompetitionService } from './competition.service';
import { CompetitionController } from './competition.controller';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [CompetitionController],
  providers: [CompetitionService],
  exports: [CompetitionService],
})
export class CompetitionModule {}
