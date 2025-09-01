import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { SupportService } from './support.service';
import type { CreateTicketRequest, TicketResponse } from './support.service';
import { JwtGuard } from '../common/guards/jwt.guard';
import { User, UserPayload } from '../common/decorators/user.decorator';

@ApiTags('Support')
@ApiBearerAuth()
@Controller('support')
@UseGuards(JwtGuard)
export class SupportController {
  private readonly logger = new Logger(SupportController.name);

  constructor(private readonly supportService: SupportService) {}

  @Post('report-issue')
  @ApiOperation({
    summary: 'Report Issue',
    description: 'Reports payment or order issues for support',
  })
  @ApiBody({
    schema: {
      example: {
        type: 'payment_failed',
        order_id: 'order_123',
        transactionId: 'txn_123',
        description: 'Payment failed during checkout process',
        priority: 'high',
        attachments: [
          {
            filename: 'error_screenshot.png',
            url: 'https://example.com/screenshots/error.png',
            type: 'image/png',
          },
        ],
        contactPreference: 'email',
        userAgent: 'Mozilla/5.0...',
        ipAddress: '192.168.1.1',
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Issue reported successfully',
    schema: {
      example: {
        success: true,
        ticketId: 'ticket_123',
        estimatedResponseTime: '4-8 hours',
        supportEmail: 'support@arzansite.com',
        supportPhone: '+98-21-12345678',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async reportIssue(
    @User() user: UserPayload,
    @Body() request: CreateTicketRequest,
  ): Promise<TicketResponse> {
    this.logger.log(`User ${user.id} reporting issue: ${request.type}`);

    if (!request.type || !request.description || !request.priority) {
      throw new BadRequestException('Missing required fields: type, description, priority');
    }

    if (request.description.length < 10) {
      throw new BadRequestException('Description must be at least 10 characters long');
    }

    if (!['low', 'medium', 'high', 'urgent'].includes(request.priority)) {
      throw new BadRequestException('Invalid priority level');
    }

    if (!['email', 'phone', 'dashboard'].includes(request.contactPreference)) {
      throw new BadRequestException('Invalid contact preference');
    }

    return this.supportService.reportIssue(user.id, request);
  }

  @Get('tickets/:ticketId')
  @ApiOperation({
    summary: 'Get Support Ticket Status',
    description: 'Retrieves support ticket status and conversation history',
  })
  @ApiResponse({
    status: 200,
    description: 'Support ticket details retrieved successfully',
    schema: {
      example: {
        ticketId: 'ticket_123',
        status: 'open',
        priority: 'high',
        subject: 'Payment failed during checkout',
        description: 'Payment failed during checkout process',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        estimatedResolution: '24-48 hours',
        assignedTo: 'support_team',
        messages: [
          {
            id: 'msg_123',
            sender: 'user',
            message: 'Payment failed during checkout process',
            timestamp: '2024-01-01T00:00:00.000Z',
            attachments: [],
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Support ticket not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getTicketStatus(
    @Param('ticketId') ticketId: string,
    @User() user: UserPayload,
  ) {
    this.logger.log(`User ${user.id} requesting ticket status for ${ticketId}`);
    return this.supportService.getTicketStatus(ticketId, user.id);
  }

  @Post('tickets/:ticketId/messages')
  @ApiOperation({
    summary: 'Add Message to Ticket',
    description: 'Adds a new message to an existing support ticket',
  })
  @ApiBody({
    schema: {
      example: {
        message: 'I have additional information about this issue',
        attachments: [
          {
            filename: 'additional_info.pdf',
            url: 'https://example.com/files/info.pdf',
            type: 'application/pdf',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Message added successfully',
    schema: {
      example: {
        success: true,
        messageId: 'msg_456',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid message data' })
  @ApiResponse({ status: 404, description: 'Support ticket not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async addMessageToTicket(
    @Param('ticketId') ticketId: string,
    @User() user: UserPayload,
    @Body() body: {
      message: string;
      attachments?: Array<{ filename: string; url: string; type: string }>;
    },
  ) {
    this.logger.log(`User ${user.id} adding message to ticket ${ticketId}`);

    if (!body.message || body.message.trim().length === 0) {
      throw new BadRequestException('Message cannot be empty');
    }

    if (body.message.length > 2000) {
      throw new BadRequestException('Message is too long (maximum 2000 characters)');
    }

    return this.supportService.addMessageToTicket(
      ticketId,
      user.id,
      body.message,
      body.attachments,
    );
  }

  @Get('tickets')
  @ApiOperation({
    summary: 'Get User Tickets',
    description: 'Retrieves user\'s support tickets with filtering and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'User tickets retrieved successfully',
    schema: {
      example: {
        tickets: [
          {
            id: 'ticket_123',
            type: 'payment_failed',
            description: 'Payment failed during checkout',
            priority: 'high',
            status: 'open',
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z',
          },
        ],
        pagination: {
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserTickets(
    @User() user: UserPayload,
    @Query('status') status?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    this.logger.log(`User ${user.id} requesting tickets with status: ${status}`);
    return this.supportService.getUserTickets(user.id, status, page, limit);
  }

  @Post('tickets/:ticketId/status')
  @ApiOperation({
    summary: 'Update Ticket Status (Admin Only)',
    description: 'Updates support ticket status (admin functionality)',
  })
  @ApiBody({
    schema: {
      example: {
        status: 'in_progress',
        adminUserId: 'admin_123',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Ticket status updated successfully',
    schema: {
      example: {
        success: true,
        updatedStatus: 'in_progress',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid status' })
  @ApiResponse({ status: 404, description: 'Support ticket not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateTicketStatus(
    @Param('ticketId') ticketId: string,
    @User() user: UserPayload,
    @Body() body: {
      status: 'open' | 'in_progress' | 'resolved' | 'closed';
      adminUserId: string;
    },
  ) {
    this.logger.log(`Admin ${user.id} updating ticket ${ticketId} status to ${body.status}`);

    if (!['open', 'in_progress', 'resolved', 'closed'].includes(body.status)) {
      throw new BadRequestException('Invalid status value');
    }

    return this.supportService.updateTicketStatus(ticketId, body.status, body.adminUserId);
  }

  @Get('faq')
  @ApiOperation({
    summary: 'Get FAQ',
    description: 'Retrieves frequently asked questions and answers',
  })
  @ApiResponse({
    status: 200,
    description: 'FAQ retrieved successfully',
    schema: {
      example: {
        categories: [
          {
            id: 'payments',
            name: 'Payment Issues',
            questions: [
              {
                id: 'faq_1',
                question: 'What payment methods do you accept?',
                answer: 'We accept credit cards, debit cards, and wallet payments.',
              },
            ],
          },
        ],
      },
    },
  })
  async getFAQ() {
    // This would typically fetch from a database
    return {
      categories: [
        {
          id: 'payments',
          name: 'Payment Issues',
          questions: [
            {
              id: 'faq_1',
              question: 'What payment methods do you accept?',
              answer: 'We accept credit cards, debit cards, and wallet payments through ZarinPal gateway.',
            },
            {
              id: 'faq_2',
              question: 'What should I do if my payment fails?',
              answer: 'If your payment fails, please check your card details and try again. If the issue persists, contact our support team.',
            },
          ],
        },
        {
          id: 'orders',
          name: 'Order Management',
          questions: [
            {
              id: 'faq_3',
              question: 'How can I track my order progress?',
              answer: 'You can track your order progress through your dashboard or by contacting our support team.',
            },
            {
              id: 'faq_4',
              question: 'Can I cancel my order?',
              answer: 'Orders can be cancelled within 24 hours of placement. Please contact support for assistance.',
            },
          ],
        },
        {
          id: 'wallet',
          name: 'Wallet Management',
          questions: [
            {
              id: 'faq_5',
              question: 'How do I add money to my wallet?',
              answer: 'You can add money to your wallet through the wallet section in your dashboard using various payment methods.',
            },
            {
              id: 'faq_6',
              question: 'Is my wallet balance secure?',
              answer: 'Yes, your wallet balance is secure and protected by industry-standard security measures.',
            },
          ],
        },
      ],
    };
  }

  @Get('contact-info')
  @ApiOperation({
    summary: 'Get Contact Information',
    description: 'Retrieves support contact information',
  })
  @ApiResponse({
    status: 200,
    description: 'Contact information retrieved successfully',
    schema: {
      example: {
        email: 'support@arzansite.com',
        phone: '+98-21-12345678',
        address: 'Tehran, Iran',
        workingHours: '9 AM - 6 PM (IRST)',
        responseTime: '4-8 hours',
      },
    },
  })
  async getContactInfo() {
    return {
      email: 'support@arzansite.com',
      phone: '+98-21-12345678',
      address: 'Tehran, Iran',
      workingHours: '9 AM - 6 PM (IRST)',
      responseTime: '4-8 hours',
      emergencyContact: '+98-21-12345679',
    };
  }
}
