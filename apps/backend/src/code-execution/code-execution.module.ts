import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { CodeExecutionController } from './code-execution.controller';
import { CodeExecutionService } from './code-execution.service';
import { Judge0ClientService } from './judge0-client.service';

@Module({
  imports: [ConfigModule, DatabaseModule],
  controllers: [CodeExecutionController],
  providers: [CodeExecutionService, Judge0ClientService],
  exports: [CodeExecutionService, Judge0ClientService],
})
export class CodeExecutionModule {}

