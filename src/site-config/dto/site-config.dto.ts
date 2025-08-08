import { IsEnum } from 'class-validator';

export enum SiteMode {
  NORMAL = 'normal',
  TEMPORARILY_UNAVAILABLE = 'temporarily_unavailable',
  UPDATE_MODE = 'update_mode',
  DEVELOPMENT_MODE = 'development_mode',
}

export class UpdateSiteConfigDto {
  @IsEnum(SiteMode)
  mode: SiteMode;
}
