import { IsString, IsOptional, IsNumber, IsEnum, IsObject } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum SubmitMode {
  DRAFT = 'draft',
  PAYMENT = 'payment',
}

export class CreateUnifiedOrderDto {
  @IsEnum(SubmitMode)
  submitMode: SubmitMode;

  @IsObject()
  @Transform(({ value, obj }) => {
    let v = value ?? obj?.wizard_data ?? obj?.wizardData;
    if (typeof v === 'string') { try { return JSON.parse(v); } catch { return v; } }
    return v;
  }, { toClassOnly: true })
  wizardData: Record<string, unknown>;

  @IsNumber()
  @Type(() => Number)
  @Transform(({ value, obj }) => value ?? obj?.total_amount ?? obj?.totalAmount, { toClassOnly: true })
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
  @Transform(({ value, obj }) => value ?? obj?.site_type ?? obj?.siteType, { toClassOnly: true })
  siteType?: string;
}
