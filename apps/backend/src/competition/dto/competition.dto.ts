import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsArray,
  IsInt,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { RoundControlAction } from '@ignitron/shared';

export class RoundControlDto {
  @IsEnum([
    'START_ROUND_1',
    'PAUSE_ROUND',
    'RESUME_ROUND',
    'END_ROUND',
    'ENTER_EVALUATION',
    'COMPLETE_EVALUATION',
    'START_ROUND_2',
    'START_ROUND_3',
    'COMPLETE_COMPETITION',
    'RESET_COMPETITION',
    'ANNOUNCE_ROUND',
    'START_COUNTDOWN',
    'CANCEL_COUNTDOWN',
  ], { message: 'Invalid round control action' })
  @IsNotEmpty({ message: 'Action is required' })
  action!: RoundControlAction;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  resetType?: 'DEMO_ONLY' | 'FULL_RESET';

  @IsInt()
  @IsOptional()
  roundNumber?: number;

  @IsInt()
  @IsOptional()
  countdownDurationSeconds?: number;

  @IsBoolean()
  @IsOptional()
  confirmLiveAdjustment?: boolean;
}

export class UpdateRoundDurationDto {
  @IsInt({ message: 'Duration in minutes must be an integer' })
  @Min(1, { message: 'Duration must be at least 1 minute' })
  @Max(240, { message: 'Duration cannot exceed 240 minutes' })
  durationMinutes!: number;

  @IsBoolean()
  @IsOptional()
  confirmLiveAdjustment?: boolean;
}

export class ShortlistSubmissionDto {
  @IsInt({ message: 'Target round number must be an integer' })
  @Min(2, { message: 'Target round number must be 2 or 3' })
  @Max(3, { message: 'Target round number must be 2 or 3' })
  roundNumber!: number;

  @IsArray({ message: 'Qualified team IDs must be an array' })
  @IsString({ each: true, message: 'Each qualified team ID must be a string' })
  qualifiedTeamIds!: string[];

  @IsString()
  @IsOptional()
  notes?: string;
}

export class GenerateDemoDataDto {
  @IsInt()
  @Min(5)
  @Max(30)
  @IsOptional()
  count?: number = 20;
}

export class BackendPublishLeaderboardDto {
  @IsInt()
  @IsOptional()
  roundNumber?: number;

  @IsBoolean()
  @IsNotEmpty()
  isPublished!: boolean;
}

