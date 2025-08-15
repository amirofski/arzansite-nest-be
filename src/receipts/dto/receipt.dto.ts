import { IsString, IsNumber, IsDateString, IsOptional, IsEnum } from 'class-validator';

export enum ReceiptFormat {
  PDF = 'pdf',
  HTML = 'html',
}

export class ReceiptResponseDto {
  id: string;
  invoiceId: string;
  refId: string;
  amount: number;
  format: ReceiptFormat;
  createdAt: string;
  updatedAt: string;
}

export class DownloadReceiptDto {
  @IsEnum(ReceiptFormat)
  format: ReceiptFormat;
}
