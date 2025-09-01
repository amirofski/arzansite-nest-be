import { IsString, IsNumber, IsOptional, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';

export class PaymentRequestDto {
  @IsOptional()
  @IsString()
  order_id?: string;

  @IsNumber()
  @Type(() => Number)
  amount: number;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  callback_url?: string;

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
  order_id?: string;

  @IsString()
  authority: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  amount?: number;
}

export class PaymentRefundDto {
  @IsString()
  order_id: string;

  @IsOptional()
  @IsNumber()
  amount?: number;
}

export class PaymentCancelDto {
  @IsString()
  order_id: string;
}
