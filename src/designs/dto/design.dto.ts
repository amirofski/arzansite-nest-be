import { IsObject, IsOptional, IsString } from 'class-validator';

export class SaveDesignDto {
  @IsObject()
  design: any;

  @IsOptional()
  @IsObject()
  options?: any;
}

export class UpdateDesignOptionsDto {
  @IsObject()
  options: any;
}

export class UpdatePreviewUrlDto {
  @IsString()
  previewUrl: string;
}
