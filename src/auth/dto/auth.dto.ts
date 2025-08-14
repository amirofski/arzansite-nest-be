import { IsEmail, IsString, IsOptional, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignUpDto {
  @ApiProperty({
    description: 'User email address (must be unique)',
    example: 'user@example.com',
    pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password (minimum 6 characters, should be secure)',
    example: 'SecurePassword123!',
    minLength: 6,
    pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{6,}$',
  })
  @IsString()
  password: string;

  @ApiProperty({
    description: 'Additional user metadata (optional)',
    example: {
      name: 'John Doe',
      first_name: 'John',
      last_name: 'Doe',
      company: 'Example Corp',
      phone: '+1234567890',
      address: '123 Main St, City, Country'
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class SignInDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePassword123!',
    minLength: 6,
  })
  @IsString()
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token for getting new access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NGY4YTFiMmMzZDRlNWY2YTdiOGM5ZDAiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTczNDI3MjgwMCwiZXhwIjoxNzM0ODc3NjAwfQ.example',
    minLength: 100,
  })
  @IsString()
  refresh_token: string;
}

export class VerifyEmailDto {
  @ApiProperty({
    description: 'Email verification token from email link',
    example: '64f8a1b2c3d4e5f6a7b8c9d0',
    minLength: 24,
  })
  @IsString()
  token: string;
}

export class LoginWithJwtDto {
  @ApiProperty({
    description: 'Appwrite user email address',
    example: 'user@example.com',
    pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Appwrite Session JWT obtained on the frontend',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NGY4YTFiMmMzZDRlNWY2YTdiOGM5ZDAiLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJpYXQiOjE3MzQyNzI4MDAsImV4cCI6MTczNDI3NjQwMH0.example',
    minLength: 100,
  })
  @IsString()
  jwt: string;
}