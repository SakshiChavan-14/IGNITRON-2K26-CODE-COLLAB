import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { CompetitionService } from './competition.service';
import { CompetitionController } from './competition.controller';
import { QuestionsService } from './questions.service';
import { QuestionsController } from './questions.controller';
import { ArenaService } from './arena.service';
import { ArenaController } from './arena.controller';
import { EvaluationService } from './evaluation.service';
import { EvaluationController } from './evaluation.controller';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [
    CompetitionController,
    QuestionsController,
    ArenaController,
    EvaluationController,
  ],
  providers: [
    CompetitionService,
    QuestionsService,
    ArenaService,
    EvaluationService,
  ],
  exports: [
    CompetitionService,
    QuestionsService,
    ArenaService,
    EvaluationService,
  ],
})
export class CompetitionModule {}
