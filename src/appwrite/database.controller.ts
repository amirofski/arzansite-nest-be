import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AppwriteService } from './appwrite.service';
import { JwtGuard } from '../common/guards/jwt.guard';
import {
  CreateDocumentDto,
  UpdateDocumentDto,
  ListDocumentsDto,
  DocumentResponseDto,
  ListDocumentsResponseDto,
} from './dto/database.dto';

@ApiTags('database')
@Controller('db')
@UseGuards(JwtGuard)
@ApiBearerAuth()
export class DatabaseController {
  constructor(private readonly appwriteService: AppwriteService) {}

  @Post(':collectionId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create document',
    description: 'Create a new document in the specified collection',
  })
  @ApiParam({ name: 'collectionId', description: 'Collection ID' })
  @ApiBody({ type: CreateDocumentDto })
  @ApiResponse({
    status: 201,
    description: 'Document created successfully',
    type: DocumentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createDocument(
    @Param('collectionId') collectionId: string,
    @Body() createDocumentDto: CreateDocumentDto,
  ): Promise<DocumentResponseDto> {
    const document = await this.appwriteService.createDocument(
      collectionId,
      createDocumentDto.data,
      createDocumentDto.documentId,
    );
    return {
      $id: document.$id,
      $collectionId: document.$collectionId,
      $databaseId: document.$databaseId,
      data: createDocumentDto.data,
    } as DocumentResponseDto;
  }

  @Get(':collectionId/:documentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get document',
    description: 'Retrieve a document by ID from the specified collection',
  })
  @ApiParam({ name: 'collectionId', description: 'Collection ID' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiResponse({
    status: 200,
    description: 'Document retrieved successfully',
    type: DocumentResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getDocument(
    @Param('collectionId') collectionId: string,
    @Param('documentId') documentId: string,
  ): Promise<DocumentResponseDto> {
    const document = await this.appwriteService.getDocument(
      collectionId,
      documentId,
    );
    return {
      $id: document.$id,
      $collectionId: document.$collectionId,
      $databaseId: document.$databaseId,
      data: document,
    } as DocumentResponseDto;
  }

  @Put(':collectionId/:documentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update document',
    description: 'Update an existing document in the specified collection',
  })
  @ApiParam({ name: 'collectionId', description: 'Collection ID' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiBody({ type: UpdateDocumentDto })
  @ApiResponse({
    status: 200,
    description: 'Document updated successfully',
    type: DocumentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async updateDocument(
    @Param('collectionId') collectionId: string,
    @Param('documentId') documentId: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
  ): Promise<DocumentResponseDto> {
    const document = await this.appwriteService.updateDocument(
      collectionId,
      documentId,
      updateDocumentDto.data,
    );
    return {
      $id: document.$id,
      $collectionId: document.$collectionId,
      $databaseId: document.$databaseId,
      data: updateDocumentDto.data,
    } as DocumentResponseDto;
  }

  @Delete(':collectionId/:documentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete document',
    description: 'Delete a document from the specified collection',
  })
  @ApiParam({ name: 'collectionId', description: 'Collection ID' })
  @ApiParam({ name: 'documentId', description: 'Document ID' })
  @ApiResponse({
    status: 200,
    description: 'Document deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async deleteDocument(
    @Param('collectionId') collectionId: string,
    @Param('documentId') documentId: string,
  ): Promise<{ success: boolean }> {
    return await this.appwriteService.deleteDocument(
      collectionId,
      documentId,
    );
  }

  @Get(':collectionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List documents',
    description: 'List documents from the specified collection with optional queries',
  })
  @ApiParam({ name: 'collectionId', description: 'Collection ID' })
  @ApiQuery({ name: 'queries', required: false, type: [String] })
  @ApiResponse({
    status: 200,
    description: 'Documents retrieved successfully',
    type: ListDocumentsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listDocuments(
    @Param('collectionId') collectionId: string,
    @Query() query: ListDocumentsDto,
  ): Promise<ListDocumentsResponseDto> {
    const response = await this.appwriteService.listDocuments(
      collectionId,
      query.queries || [],
    );
    return {
      total: response.total,
      documents: response.documents.map(doc => ({
        $id: doc.$id,
        $collectionId: doc.$collectionId,
        $databaseId: doc.$databaseId,
        data: doc,
      })) as DocumentResponseDto[],
    };
  }
}
