import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AnnouncementService } from './announcement.service';
import { AnnouncementController } from './announcement.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [AnnouncementController],
  providers: [AnnouncementService],
  exports: [AnnouncementService],
})
export class AnnouncementModule {}
