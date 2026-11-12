import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { AnnouncementPriority } from '@ignitron/shared';

export class CreateAnnouncementDto {
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  title!: string;

  @IsString()
  @IsNotEmpty({ message: 'Message is required' })
  message!: string;

  @IsEnum(['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const)
  @IsOptional()
  priority?: AnnouncementPriority;

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}

export class UpdateAnnouncementDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  message?: string;

  @IsEnum(['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const)
  @IsOptional()
  priority?: AnnouncementPriority;

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}

export class TogglePublishDto {
  @IsBoolean()
  isPublished!: boolean;
}
