import { IsString, IsOptional, IsEnum } from 'class-validator';
import { OrderStatus, PaymentStatus } from './order.dto';

export class UpdateOrderStatusDto {
  @IsString()
  orderId: string;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsEnum(PaymentStatus)
  payment_status?: PaymentStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}