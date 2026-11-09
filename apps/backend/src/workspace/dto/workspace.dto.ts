import {
  IsString,
  IsNotEmpty,
  IsIn,
  IsOptional,
  IsInt,
  MaxLength,
} from 'class-validator';
import { EXECUTION_LIMITS } from '@ignitron/shared';

export class SaveDraftDto {
  @IsString()
  @IsNotEmpty({ message: 'Source code cannot be empty' })
  @MaxLength(EXECUTION_LIMITS.MAX_SOURCE_CODE_SIZE_BYTES, {
    message: `Source code exceeds maximum limit of ${EXECUTION_LIMITS.MAX_SOURCE_CODE_SIZE_BYTES / 1024} KB`,
  })
  sourceCode: string;

  @IsString()
  @IsIn(['cpp', 'java', 'python', 'javascript'], {
    message: 'Language must be one of: cpp, java, python, javascript',
  })
  language: 'cpp' | 'java' | 'python' | 'javascript';

  @IsOptional()
  @IsInt()
  roundNumber?: number;

  @IsOptional()
  @IsInt()
  expectedVersion?: number;
}
