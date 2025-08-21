import {
  Controller,
  Post,
  Get,
  Body,
  Param,
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
} from '@nestjs/swagger';
import { AppwriteService } from './appwrite.service';
import { JwtGuard } from '../common/guards/jwt.guard';
import { ID } from 'node-appwrite';

@ApiTags('messaging')
@Controller('messaging')
@UseGuards(JwtGuard)
@ApiBearerAuth()
export class MessagingController {
  constructor(private readonly appwriteService: AppwriteService) {}

  @Post('topics')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create topic',
    description: 'Create a new messaging topic',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        topicId: { type: 'string', description: 'Topic ID (optional, will be derived from name if not provided)' },
        name: { type: 'string', description: 'Topic name' },
        subscribe: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Array of user IDs to subscribe' 
        },
      },
      required: ['name'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Topic created successfully',
    schema: {
      type: 'object',
      properties: {
        $id: { type: 'string', example: 'unique-topic-id' },
        name: { type: 'string', example: 'General Chat' },
        subscribe: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createTopic(@Body() body: { topicId?: string; name: string; subscribe?: string[] }) {
    try {
      const topicId = (body.topicId && body.topicId.trim().length > 0)
        ? body.topicId
        : (body.name || '').toLowerCase().replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '') || ID.unique();

      const topic = await this.appwriteService.createTopic(
        topicId,
        body.name,
        body.subscribe || [],
      );
      return topic;
    } catch (error) {
      throw new Error(`Failed to create topic: ${error.message}`);
    }
  }

  @Post('topics/:topicId/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Send message',
    description: 'Send a message to a specific topic',
  })
  @ApiParam({ name: 'topicId', description: 'Topic ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Message content' },
        data: { type: 'object', description: 'Additional message data' },
      },
      required: ['message'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Message sent successfully',
    schema: {
      type: 'object',
      properties: {
        messageId: { type: 'string', example: 'unique-message-id' },
        status: { type: 'string', example: 'sent' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sendMessage(
    @Param('topicId') topicId: string,
    @Body() body: { message: string; data?: any },
  ) {
    try {
      const response = await this.appwriteService.sendMessage(
        topicId,
        body.message,
        body.data,
      );
      return response;
    } catch (error) {
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }
}
