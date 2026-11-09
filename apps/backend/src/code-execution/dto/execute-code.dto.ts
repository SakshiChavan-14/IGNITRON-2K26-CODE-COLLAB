import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  IsIn,
  MaxLength,
} from 'class-validator';
import { EXECUTION_LIMITS } from '@ignitron/shared';

export class ExecuteCodeDto {
  @IsOptional()
  @IsIn(['cpp', 'java', 'python', 'javascript'])
  languageKey?: 'cpp' | 'java' | 'python' | 'javascript';

  @IsOptional()
  @IsInt()
  languageId?: number;

  @IsString()
  @IsNotEmpty({ message: 'Source code cannot be empty' })
  @MaxLength(EXECUTION_LIMITS.MAX_SOURCE_CODE_SIZE_BYTES, {
    message: `Source code exceeds maximum limit of ${EXECUTION_LIMITS.MAX_SOURCE_CODE_SIZE_BYTES} bytes (64 KB)`,
  })
  sourceCode: string;

  @IsOptional()
  @IsString()
  @MaxLength(EXECUTION_LIMITS.MAX_STDIN_SIZE_BYTES, {
    message: `Standard input exceeds maximum limit of ${EXECUTION_LIMITS.MAX_STDIN_SIZE_BYTES} bytes (32 KB)`,
  })
  stdin?: string;

  @IsOptional()
  @IsBoolean()
  isTestRun?: boolean;
}

