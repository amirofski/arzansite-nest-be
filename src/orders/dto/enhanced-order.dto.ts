import { IsString, IsNumber, IsEnum, IsOptional, IsObject, IsArray, IsBoolean, IsDateString, ValidateNested, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum SiteType {
  PERSONAL = 'personal',
  BUSINESS = 'business'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCEEDED = 'succeeded',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled'
}

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum PaymentMethod {
  WALLET = 'wallet',
  ZARINPAL = 'zarinpal'
}

export enum PaymentCycle {
  MONTHLY = 'monthly',
  ANNUAL = 'annual'
}

export class CanvasDimensionsDto {
  @ApiProperty({ description: 'Canvas width in pixels' })
  @IsNumber()
  width: number;

  @ApiProperty({ description: 'Canvas height in pixels' })
  @IsNumber()
  height: number;
}

export class SectionDto {
  @ApiProperty({ description: 'Unique section identifier' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Type of section' })
  @IsString()
  sectionType: string;

  @ApiProperty({ description: 'Layout identifier' })
  @IsString()
  layoutId: string;

  @ApiProperty({ description: 'Section order' })
  @IsNumber()
  order: number;

  @ApiProperty({ description: 'Custom section data', required: false })
  @IsOptional()
  @IsObject()
  customData?: Record<string, unknown>;
}

export class PageDto {
  @ApiProperty({ description: 'Unique page identifier' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Page name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Page sections', type: [SectionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionDto)
  sections: SectionDto[];

  @ApiProperty({ description: 'Canvas dimensions' })
  @ValidateNested()
  @Type(() => CanvasDimensionsDto)
  canvasDimensions: CanvasDimensionsDto;
}

export class DynamicDesignDto {
  @ApiProperty({ description: 'Design pages', type: [PageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PageDto)
  pages: PageDto[];

  @ApiProperty({ description: 'Current page identifier' })
  @IsString()
  currentPageId: string;
}

export class WebsiteFrameworkDto {
  @ApiProperty({ description: 'Design method' })
  @IsEnum(['template', 'dynamic'])
  designMethod: 'template' | 'dynamic';

  @ApiProperty({ description: 'Dynamic design configuration', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => DynamicDesignDto)
  dynamicDesign?: DynamicDesignDto;
}

export class BrandingDto {
  @ApiProperty({ description: 'Primary brand color' })
  @IsString()
  primaryColor: string;

  @ApiProperty({ description: 'Font family' })
  @IsString()
  fontFamily: string;

  @ApiProperty({ description: 'Logo URL', required: false })
  @IsOptional()
  @IsString()
  logo?: string;
}

export class AdditionalServicesDto {
  @ApiProperty({ description: 'SEO optimization service' })
  @IsBoolean()
  seoOptimization: boolean;

  @ApiProperty({ description: 'Social media integration' })
  @IsBoolean()
  socialMediaIntegration: boolean;

  @ApiProperty({ description: 'Analytics setup' })
  @IsBoolean()
  analyticsSetup: boolean;

  @ApiProperty({ description: 'Backup service' })
  @IsBoolean()
  backupService: boolean;

  @ApiProperty({ description: 'Maintenance plan' })
  @IsBoolean()
  maintenancePlan: boolean;

  @ApiProperty({ description: 'Rush delivery' })
  @IsBoolean()
  rushDelivery: boolean;
}

export class DomainDto {
  @ApiProperty({ description: 'Domain name' })
  @IsString()
  domain: string;

  @ApiProperty({ description: 'Domain extension' })
  @IsString()
  extension: string;

  @ApiProperty({ description: 'Domain price' })
  @IsNumber()
  price: number;

  @ApiProperty({ description: 'Domain availability' })
  @IsBoolean()
  available: boolean;
}

export class DomainsDto {
  @ApiProperty({ description: 'Primary domain' })
  @IsString()
  primary_domain: string;

  @ApiProperty({ description: 'Additional domains', type: [DomainDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DomainDto)
  additional_domains: DomainDto[];
}

export class PricingDto {
  @ApiProperty({ description: 'Base price' })
  @IsNumber()
  basePrice: number;

  @ApiProperty({ description: 'Pages cost' })
  @IsNumber()
  pagesCost: number;

  @ApiProperty({ description: 'Sections cost' })
  @IsNumber()
  sectionsCost: number;

  @ApiProperty({ description: 'Additional services cost' })
  @IsNumber()
  additionalServicesCost: number;

  @ApiProperty({ description: 'Domain cost' })
  @IsNumber()
  domainCost: number;

  @ApiProperty({ description: 'Total price' })
  @IsNumber()
  totalPrice: number;

  @ApiProperty({ description: 'Monthly price' })
  @IsNumber()
  monthlyPrice: number;

  @ApiProperty({ description: 'Annual price' })
  @IsNumber()
  annualPrice: number;

  @ApiProperty({ description: 'Annual discount' })
  @IsNumber()
  annualDiscount: number;

  @ApiProperty({ description: 'Payment cycle' })
  @IsEnum(PaymentCycle)
  paymentCycle: PaymentCycle;

  @ApiProperty({ description: 'Auto renewal' })
  @IsBoolean()
  autoRenewal: boolean;
}

export class UserInfoDto {
  @ApiProperty({ description: 'Domain name' })
  @IsString()
  domain: string;

  @ApiProperty({ description: 'User name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'User email' })
  @IsString()
  email: string;

  @ApiProperty({ description: 'Additional domains', type: [String] })
  @IsArray()
  @IsString({ each: true })
  additionalDomains: string[];
}

export class WizardDataDto {
  @ApiProperty({ description: 'Website framework configuration' })
  @ValidateNested()
  @Type(() => WebsiteFrameworkDto)
  websiteFramework: WebsiteFrameworkDto;

  @ApiProperty({ description: 'Branding configuration' })
  @ValidateNested()
  @Type(() => BrandingDto)
  branding: BrandingDto;

  @ApiProperty({ description: 'Additional services' })
  @ValidateNested()
  @Type(() => AdditionalServicesDto)
  additionalServices: AdditionalServicesDto;

  @ApiProperty({ description: 'Domain configuration' })
  @ValidateNested()
  @Type(() => DomainsDto)
  domains: DomainsDto;

  @ApiProperty({ description: 'Pricing configuration' })
  @ValidateNested()
  @Type(() => PricingDto)
  pricing: PricingDto;

  @ApiProperty({ description: 'Payment cycle' })
  @IsEnum(PaymentCycle)
  paymentCycle: PaymentCycle;

  @ApiProperty({ description: 'Auto renewal' })
  @IsBoolean()
  autoRenewal: boolean;

  @ApiProperty({ description: 'User information' })
  @ValidateNested()
  @Type(() => UserInfoDto)
  userInfo: UserInfoDto;
}

export class CreateEnhancedOrderDto {
  @ApiProperty({ description: 'Order title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Order description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Order price' })
  @IsNumber()
  price: number;

  @ApiProperty({ description: 'Site type', enum: SiteType })
  @IsEnum(SiteType)
  siteType: SiteType;

  @ApiProperty({ description: 'Wizard configuration data' })
  @ValidateNested()
  @Type(() => WizardDataDto)
  wizardData: WizardDataDto;

  @ApiProperty({ description: 'Order status', enum: OrderStatus, default: OrderStatus.PENDING })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus = OrderStatus.PENDING;

  @ApiProperty({ description: 'Payment status', enum: PaymentStatus, default: PaymentStatus.PENDING })
  @IsOptional()
  @IsEnum(PaymentStatus)
  payment_status?: PaymentStatus = PaymentStatus.PENDING;

  @ApiProperty({ description: 'User ID', required: false })
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @ApiProperty({ description: 'Session ID', required: false })
  @IsOptional()
  @IsString()
  sessionId?: string;
}

export class UpdateEnhancedOrderDto {
  @ApiProperty({ description: 'Order title', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'Order description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Order price', required: false })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiProperty({ description: 'Order status', enum: OrderStatus, required: false })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiProperty({ description: 'Payment status', enum: PaymentStatus, required: false })
  @IsOptional()
  @IsEnum(PaymentStatus)
  payment_status?: PaymentStatus;

  @ApiProperty({ description: 'Payment method', enum: PaymentMethod, required: false })
  @IsOptional()
  @IsEnum(PaymentMethod)
  payment_method?: PaymentMethod;

  @ApiProperty({ description: 'Transaction ID', required: false })
  @IsOptional()
  @IsString()
  transaction_id?: string;

  @ApiProperty({ description: 'Payment metadata (JSON string)', required: false })
  @IsOptional()
  @IsString()
  payment_metadata?: string;

  @ApiProperty({ description: 'Wizard data', required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => WizardDataDto)
  wizardData?: WizardDataDto;
}

export class EnhancedOrderResponseDto {
  @ApiProperty({ description: 'Order ID' })
  id: string;

  @ApiProperty({ description: 'Order title' })
  title: string;

  @ApiProperty({ description: 'Order description' })
  description: string;

  @ApiProperty({ description: 'Order price' })
  price: number;

  @ApiProperty({ description: 'Order status' })
  status: OrderStatus;

  @ApiProperty({ description: 'Payment status' })
  payment_status: PaymentStatus;

  @ApiProperty({ description: 'Payment method', required: false })
  payment_method?: PaymentMethod;

  @ApiProperty({ description: 'Transaction ID', required: false })
  transaction_id?: string;

  @ApiProperty({ description: 'Payment metadata (JSON string)', required: false })
  payment_metadata?: string;

  @ApiProperty({ description: 'User ID' })
  user_id: string;

  @ApiProperty({ description: 'Wizard data' })
  wizard_data: WizardDataDto;

  @ApiProperty({ description: 'Created timestamp' })
  created_at: string;

  @ApiProperty({ description: 'Updated timestamp' })
  updated_at: string;
}

export interface OrderProgress {
  orderId: string;
  currentStep: string;
  completedSteps: string[];
  remainingSteps: string[];
  progressPercentage: number;
  estimatedDelivery: string;
  lastUpdate: string;
  nextMilestone: string;
  timeline: ProgressTimeline[];
}

export interface ProgressTimeline {
  step: string;
  status: 'completed' | 'in_progress' | 'pending';
  completedAt?: string;
  estimatedDuration: string;
  description: string;
}

export interface EnhancedOrderDetails extends EnhancedOrderResponseDto {
  progress: OrderProgress;
  walletBalance: number;
  canPayWithWallet: boolean;
}