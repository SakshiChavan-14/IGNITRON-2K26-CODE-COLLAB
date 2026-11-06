import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

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
