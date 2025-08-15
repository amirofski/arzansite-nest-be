import { IsString, IsNumber, IsOptional, IsEmail } from 'class-validator';

export class PaymentRequestDto {
  @IsString()
  orderId: string;

  @IsNumber()
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
  @IsString()
  orderId: string;

  @IsString()
  authority: string;

  @IsNumber()
  amount: number;
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
