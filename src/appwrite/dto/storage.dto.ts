import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray } from 'class-validator';

export class ListFilesDto {
  @ApiPropertyOptional({ description: 'Array of query strings' })
  @IsOptional()
  @IsArray()
  queries?: string[];
}

export class FileResponseDto {
  @ApiProperty({ description: 'File ID' })
  $id: string;

  @ApiProperty({ description: 'Bucket ID' })
  bucket_id: string;

  @ApiProperty({ description: 'File name' })
  name: string;

  @ApiProperty({ description: 'File MIME type' })
  mime_type: string;

  @ApiProperty({ description: 'File creation date' })
  $createdAt: string;

  @ApiProperty({ description: 'File update date' })
  $updatedAt: string;

  @ApiProperty({ description: 'File permissions' })
  $permissions: string[];
}

export class ListFilesResponseDto {
  @ApiProperty({ description: 'Total number of files' })
  total: number;

  @ApiProperty({ description: 'Array of files' })
  files: FileResponseDto[];
}

export class FileUrlResponseDto {
  @ApiProperty({ description: 'File view URL' })
  url: string;

  @ApiProperty({ description: 'File ID' })
  file_id: string;
}
