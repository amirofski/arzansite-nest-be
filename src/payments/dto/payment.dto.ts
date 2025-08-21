import { IsString, IsNumber, IsOptional, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';

export class PaymentRequestDto {
  @IsOptional()
  @IsString()
  orderId?: string;

  @IsNumber()
  @Type(() => Number)
  amount: number;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  callbackUrl?: string;

  @IsOptional()
  @IsString()
  mobile?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}

export class PaymentVerifyDto {
  @IsOptional()
  @IsString()
  orderId?: string;

  @IsString()
  authority: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  amount?: number;
}

export class PaymentRefundDto {
  @IsString()
  orderId: string;

  @IsOptional()
  @IsNumber()
  amount?: number;
}

export class PaymentCancelDto {
  @IsString()
  orderId: string;
}
