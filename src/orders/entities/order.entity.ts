import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum OrderStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column({ 
    type: 'enum', 
    enum: PaymentStatus, 
    default: PaymentStatus.PENDING,
    nullable: true 
  })
  payment_status: PaymentStatus;

  @Column({ nullable: true })
  comments?: string;

  @Column({ nullable: true })
  total_pages?: number;

  @Column({ nullable: true })
  total_sections?: number;

  @Column({ nullable: true })
  user_id?: string;

  @Column({ 
    type: 'enum', 
    enum: OrderStatus, 
    default: OrderStatus.PENDING 
  })
  status: OrderStatus;

  @Column({ nullable: true })
  sessionId?: string;

  @Column({ nullable: true })
  siteType?: string;

  @Column({ type: 'json', nullable: true })
  websiteFramework?: any;

  @Column({ type: 'json', nullable: true })
  branding?: any;

  @Column({ type: 'json', nullable: true })
  additionalServices?: any;

  @Column({ type: 'json', nullable: true })
  domains?: any;

  @Column({ type: 'json', nullable: true })
  pricing?: any;

  @Column({ nullable: true })
  payment_gateway?: string;

  @Column({ nullable: true })
  callback_url?: string;

  @Column({ nullable: true })
  return_url?: string;

  @Column({ nullable: true })
  zarinpal_authority?: string;

  @Column({ nullable: true })
  zarinpal_ref_id?: string;

  @Column({ type: 'json', nullable: true })
  design_data?: any;

  @Column({ type: 'json', nullable: true })
  design_options?: any;

  @Column({ type: 'json', nullable: true })
  design_snapshot?: any;

  @Column({ nullable: true })
  design_preview_url?: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
