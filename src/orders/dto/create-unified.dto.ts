import { IsString, IsOptional, IsNumber, IsEnum, IsObject } from 'class-validator';

export enum SubmitMode {
  DRAFT = 'draft',
  PAYMENT = 'payment',
}

export class CreateUnifiedOrderDto {
  @IsEnum(SubmitMode)
  submitMode: SubmitMode;

  @IsObject()
  wizardData: Record<string, unknown>;

  @IsNumber()
  totalAmount: number; // in Rials

  @IsOptional()
  @IsString()
  currency?: string; // default IRR

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  comments?: string;

  @IsOptional()
  @IsString()
  siteType?: string;
}