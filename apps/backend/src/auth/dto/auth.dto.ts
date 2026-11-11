import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RegisterParticipantDto {
  @IsString()
  @IsNotEmpty({ message: 'Participant full name is required' })
  fullName!: string;

  @IsEmail({}, { message: 'A valid email address is required (personal or college)' })
  @IsNotEmpty({ message: 'Participant email is required' })
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  studentId?: string;
}

export class RegisterTeamDto {
  @IsString()
  @IsNotEmpty({ message: 'Team name is required' })
  teamName!: string;

  @IsString()
  @IsNotEmpty({ message: 'College/Institution name is required' })
  institution!: string;

  @IsString()
  @MinLength(8, { message: 'Team password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Team password cannot exceed 128 characters' })
  password!: string;

  @IsArray({ message: 'Participants list is required' })
  @ArrayMinSize(2, { message: 'Registration requires exactly 2 participants' })
  @ArrayMaxSize(2, { message: 'Registration requires exactly 2 participants' })
  @ValidateNested({ each: true })
  @Type(() => RegisterParticipantDto)
  participants!: [RegisterParticipantDto, RegisterParticipantDto];
}

export class AdminLoginDto {
  @IsEmail({}, { message: 'A valid email address is required' })
  @IsNotEmpty({ message: 'Email cannot be empty' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'Password cannot be empty' })
  password!: string;
}

export class TeamLoginDto {
  @IsString()
  @IsNotEmpty({ message: 'Team code is required' })
  teamCode!: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password!: string;

  @IsString()
  @IsNotEmpty({ message: 'Participant selection is required' })
  participantId!: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'Current password is required' })
  currentPassword!: string;

  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  @MaxLength(128, { message: 'New password cannot exceed 128 characters' })
  newPassword!: string;
}
