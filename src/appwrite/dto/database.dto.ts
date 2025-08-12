import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsArray, IsBoolean } from 'class-validator';

export class CreateDocumentDto {
  @ApiProperty({ description: 'Collection ID' })
  @IsString()
  collectionId: string;

  @ApiPropertyOptional({ description: 'Custom document ID (optional)' })
  @IsOptional()
  @IsString()
  documentId?: string;

  @ApiProperty({ description: 'Document data' })
  @IsObject()
  data: Record<string, any>;

  @ApiPropertyOptional({ description: 'Document permissions' })
  @IsOptional()
  @IsArray()
  permissions?: string[];
}

export class UpdateDocumentDto {
  @ApiProperty({ description: 'Document data to update' })
  @IsObject()
  data: Record<string, any>;

  @ApiPropertyOptional({ description: 'Document permissions' })
  @IsOptional()
  @IsArray()
  permissions?: string[];
}

export class ListDocumentsDto {
  @ApiPropertyOptional({ description: 'Array of query strings' })
  @IsOptional()
  @IsArray()
  queries?: string[];
}

export class DocumentResponseDto {
  @ApiProperty({ description: 'Document ID' })
  $id: string;

  @ApiProperty({ description: 'Collection ID' })
  $collectionId: string;

  @ApiProperty({ description: 'Database ID' })
  $databaseId: string;

  @ApiProperty({ description: 'Document data' })
  data: Record<string, any>;
}

export class ListDocumentsResponseDto {
  @ApiProperty({ description: 'Total number of documents' })
  total: number;

  @ApiProperty({ description: 'Array of documents' })
  documents: DocumentResponseDto[];
}
