import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, IsEnum, IsObject, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export enum SiteType {
  PERSONAL = 'personal',
  BUSINESS = 'business'
}

export enum DesignMethod {
  TEMPLATE = 'template',
  DYNAMIC = 'dynamic'
}

export enum OrderStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum PaymentCycle {
  MONTHLY = 'monthly',
  ANNUAL = 'annual'
}

export class CanvasDimensionsDto {
  @IsNumber()
  width: number;

  @IsNumber()
  height: number;
}

export class SectionDto {
  @IsString()
  id: string;

  @IsString()
  sectionType: string;

  @IsString()
  layoutId: string;

  @IsNumber()
  order: number;

  @IsOptional()
  @IsObject()
  customData?: Record<string, unknown>;
}

export class PageDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SectionDto)
  sections: SectionDto[];

  @ValidateNested()
  @Type(() => CanvasDimensionsDto)
  canvasDimensions: CanvasDimensionsDto;
}

export class DynamicDesignDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PageDto)
  pages: PageDto[];

  @IsString()
  currentPageId: string;
}

export class WebsiteFrameworkDto {
  @IsEnum(DesignMethod)
  designMethod: DesignMethod;

  @IsOptional()
  @ValidateNested()
  @Type(() => DynamicDesignDto)
  dynamicDesign?: DynamicDesignDto;
}

export class BrandingDto {
  @IsString()
  primaryColor: string;

  @IsArray()
  @IsString({ each: true })
  customColors: string[];

  @IsString()
  fontFamily: string;
}

export class AdditionalServicesDto {
  @IsBoolean()
  seoOptimization: boolean;

  @IsBoolean()
  socialMediaIntegration: boolean;

  @IsBoolean()
  analyticsSetup: boolean;

  @IsBoolean()
  backupService: boolean;

  @IsBoolean()
  maintenancePlan: boolean;

  @IsBoolean()
  rushDelivery: boolean;
}

export class DomainDto {
  @IsString()
  domain: string;

  @IsString()
  extension: string;

  @IsNumber()
  price: number;

  @IsBoolean()
  available: boolean;
}

export class DomainsDto {
  @IsString()
  primaryDomain: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DomainDto)
  additionalDomains: DomainDto[];
}

export class PricingDto {
  @IsNumber()
  basePrice: number;

  @IsNumber()
  pagesCost: number;

  @IsNumber()
  sectionsCost: number;

  @IsNumber()
  additionalServicesCost: number;

  @IsNumber()
  domainCost: number;

  @IsNumber()
  totalPrice: number;

  @IsNumber()
  monthlyPrice: number;

  @IsNumber()
  annualPrice: number;

  @IsNumber()
  annualDiscount: number;
}

export class PaymentOptionsDto {
  @IsEnum(PaymentCycle)
  paymentCycle: PaymentCycle;

  @IsBoolean()
  autoRenewal: boolean;
}

export class ProjectFileDto {
  @IsString()
  id: string;

  @IsString()
  filename: string;

  @IsString()
  originalName: string;

  @IsString()
  mimeType: string;

  @IsNumber()
  size: number;

  @IsString()
  url: string;

  @IsDateString()
  uploadedAt: Date;
}

export class WizardOrderDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsString()
  sessionId: string;

  @IsEnum(SiteType)
  siteType: SiteType;

  @ValidateNested()
  @Type(() => WebsiteFrameworkDto)
  websiteFramework: WebsiteFrameworkDto;

  @ValidateNested()
  @Type(() => BrandingDto)
  branding: BrandingDto;

  @ValidateNested()
  @Type(() => AdditionalServicesDto)
  additionalServices: AdditionalServicesDto;

  @ValidateNested()
  @Type(() => DomainsDto)
  domains: DomainsDto;

  @ValidateNested()
  @Type(() => PricingDto)
  pricing: PricingDto;

  @ValidateNested()
  @Type(() => PaymentOptionsDto)
  paymentOptions: PaymentOptionsDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectFileDto)
  projectFiles: ProjectFileDto[];

  @IsEnum(OrderStatus)
  status: OrderStatus;

  @IsOptional()
  @IsDateString()
  completedAt?: Date;
}

export class SaveProgressDto {
  @IsString()
  sessionId: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsEnum(SiteType)
  siteType?: SiteType;

  @IsOptional()
  @ValidateNested()
  @Type(() => WebsiteFrameworkDto)
  websiteFramework?: WebsiteFrameworkDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BrandingDto)
  branding?: BrandingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AdditionalServicesDto)
  additionalServices?: AdditionalServicesDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DomainsDto)
  domains?: DomainsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PricingDto)
  pricing?: PricingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentOptionsDto)
  paymentOptions?: PaymentOptionsDto;
}

export class OrderDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsNumber()
  priceTomans: number;

  @IsOptional()
  @IsString()
  comments?: string;

  @IsOptional()
  @IsEnum(SiteType)
  siteType?: SiteType;

  @IsOptional()
  @IsString()
  userId?: string; // Added to allow userId inside the order object

  @IsOptional()
  @IsString()
  user_id?: string; // Added to accept user_id from frontend
}

export class CompleteOrderDto {
  @IsString()
  sessionId: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @ValidateNested()
  @Type(() => OrderDto)
  order: OrderDto;

  @IsObject()
  designSnapshot: Record<string, unknown>;
}

export class UpdateOrderDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @ValidateNested()
  @Type(() => WebsiteFrameworkDto)
  websiteFramework?: WebsiteFrameworkDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BrandingDto)
  branding?: BrandingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AdditionalServicesDto)
  additionalServices?: AdditionalServicesDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DomainsDto)
  domains?: DomainsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PricingDto)
  pricing?: PricingDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentOptionsDto)
  paymentOptions?: PaymentOptionsDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectFileDto)
  projectFiles?: ProjectFileDto[];
}

export class CalculatePriceDto {
  @IsOptional()
  @IsEnum(SiteType)
  siteType?: SiteType;

  @IsOptional()
  @ValidateNested()
  @Type(() => WebsiteFrameworkDto)
  websiteFramework?: WebsiteFrameworkDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AdditionalServicesDto)
  additionalServices?: AdditionalServicesDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DomainsDto)
  domains?: DomainsDto;

  @IsOptional()
  @IsEnum(PaymentCycle)
  paymentCycle?: PaymentCycle;
}

export class FileUploadDto {
  @IsString()
  orderId: string;

  @IsString()
  sessionId: string;
}

export class DomainAvailabilityDto {
  @IsString()
  domain: string;

  @IsString()
  extension: string;
}

export class DomainPriceDto {
  @IsString()
  extension: string;

  @IsNumber()
  price: number;

  @IsBoolean()
  available: boolean;
}

export class DesignOptionsDto {
  @IsString()
  siteType: string;

  @IsArray()
  modules: unknown[];

  @IsObject()
  branding: Record<string, unknown>;

  @IsObject()
  userInfo: Record<string, unknown>;

  @IsObject()
  pricing: Record<string, unknown>;
}

export class SaveDesignDto {
  @IsString()
  orderId: string;

  @ValidateNested()
  @Type(() => DynamicDesignDto)
  dynamicDesign: DynamicDesignDto;

  @ValidateNested()
  @Type(() => DesignOptionsDto)
  options: DesignOptionsDto;
}

export class GetDesignDto {
  @IsString()
  orderId: string;
}
