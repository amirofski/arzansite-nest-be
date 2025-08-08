import { IsEmail, IsString, IsOptional, IsObject } from 'class-validator';

export class SignUpDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsObject()
  metadata?: any;
}

export class SignInDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class RefreshTokenDto {
  @IsString()
  refresh_token: string;
}
