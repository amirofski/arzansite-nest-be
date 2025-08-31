import { Injectable, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppwriteService } from '../appwrite/appwrite.service';
import { EmailService } from '../email/email.service';
import { ID, Query } from 'node-appwrite';

export interface SupportTicket {
  id: string;
  userId: string;
  type: 'payment_failed' | 'order_problem' | 'wallet_issue' | 'technical_problem' | 'other';
  orderId?: string;
  transactionId?: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  attachments: Array<{
    filename: string;
    url: string;
    type: string;
  }>;
  contactPreference: 'email' | 'phone' | 'dashboard';
  userAgent: string;
  ipAddress: string;
  createdAt: string;
  updatedAt: string;
  estimatedResolution?: string;
  assignedTo?: string;
  messages: Array<{
    id: string;
    sender: 'user' | 'support';
    message: string;
    timestamp: string;
    attachments: Array<{
      filename: string;
      url: string;
      type: string;
    }>;
  }>;
}

export interface CreateTicketRequest {
  type: 'payment_failed' | 'order_problem' | 'wallet_issue' | 'technical_problem' | 'other';
  orderId?: string;
  transactionId?: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  attachments?: Array<{
    filename: string;
    url: string;
    type: string;
  }>;
  contactPreference: 'email' | 'phone' | 'dashboard';
  userAgent: string;
  ipAddress: string;
}

export interface TicketResponse {
  success: boolean;
  ticketId: string;
  estimatedResponseTime: string;
  supportEmail: string;
  supportPhone: string;
}

@Injectable()
export class SupportService {
  private readonly collectionId = 'support_tickets';

  constructor(
    private readonly appwriteService: AppwriteService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async reportIssue(userId: string, request: CreateTicketRequest): Promise<TicketResponse> {
    try {
      // Validate request
      this.validateTicketRequest(request);

      // Create ticket in Appwrite
      const ticketData = {
        userId,
        type: request.type,
        orderId: request.orderId || null,
        transactionId: request.transactionId || null,
        description: request.description,
        priority: request.priority,
        status: 'open',
        attachments: request.attachments || [],
        contactPreference: request.contactPreference,
        userAgent: request.userAgent,
        ipAddress: request.ipAddress,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [{
          id: ID.unique(),
          sender: 'user',
          message: request.description,
          timestamp: new Date().toISOString(),
          attachments: request.attachments || [],
        }],
      };

      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      
      const ticket = await databases.createDocument(
        databaseId,
        this.collectionId,
        ID.unique(),
        ticketData
      );

      // Send confirmation email
      await this.sendTicketConfirmationEmail(userId, ticket.$id, request);

      // Calculate estimated response time based on priority
      const estimatedResponseTime = this.calculateEstimatedResponseTime(request.priority);

      return {
        success: true,
        ticketId: ticket.$id,
        estimatedResponseTime,
        supportEmail: 'support@arzansite.com',
        supportPhone: '+98-21-12345678',
      };
    } catch (error) {
      throw new BadRequestException(`Failed to create support ticket: ${error.message}`);
    }
  }

  async getTicketStatus(ticketId: string, userId: string): Promise<SupportTicket> {
    try {
      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      
      const ticket = await databases.getDocument(
        databaseId,
        this.collectionId,
        ticketId
      );

      // Verify user owns this ticket or is admin
      if (ticket.userId !== userId) {
        throw new UnauthorizedException('Access denied to this ticket');
      }

      return this.mapAppwriteDocumentToTicket(ticket);
    } catch (error) {
      if (error.code === 404) {
        throw new NotFoundException('Support ticket not found');
      }
      throw error;
    }
  }

  async addMessageToTicket(
    ticketId: string,
    userId: string,
    message: string,
    attachments?: Array<{ filename: string; url: string; type: string }>
  ): Promise<{ success: boolean; messageId: string }> {
    try {
      const ticket = await this.getTicketStatus(ticketId, userId);
      
      const newMessage = {
        id: ID.unique(),
        sender: 'user' as const,
        message,
        timestamp: new Date().toISOString(),
        attachments: attachments || [],
      };

      const updatedMessages = [...ticket.messages, newMessage];

      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      
      await databases.updateDocument(
        databaseId,
        this.collectionId,
        ticketId,
        {
          messages: updatedMessages,
          updatedAt: new Date().toISOString(),
        }
      );

      // Notify support team about new message
      await this.notifySupportTeam(ticketId, 'new_message', userId);

      return {
        success: true,
        messageId: newMessage.id,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to add message: ${error.message}`);
    }
  }

  async updateTicketStatus(
    ticketId: string,
    status: 'open' | 'in_progress' | 'resolved' | 'closed',
    adminUserId: string
  ): Promise<{ success: boolean; updatedStatus: string }> {
    try {
      // Verify admin permissions (this would typically be done through a guard)
      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      
      const ticket = await databases.getDocument(
        databaseId,
        this.collectionId,
        ticketId
      );

      await databases.updateDocument(
        databaseId,
        this.collectionId,
        ticketId,
        {
          status,
          updatedAt: new Date().toISOString(),
          assignedTo: adminUserId,
        }
      );

      // Notify user about status change
      await this.notifyUserAboutStatusChange(ticket.userId, ticketId, status);

      return {
        success: true,
        updatedStatus: status,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to update ticket status: ${error.message}`);
    }
  }

  async getUserTickets(
    userId: string,
    status?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    tickets: SupportTicket[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    try {
      const queries = [Query.equal('user_id', userId)];
      
      if (status) {
        queries.push(Query.equal('status', status));
      }

      const offset = (page - 1) * limit;
      
      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      
      const tickets = await databases.listDocuments(
        databaseId,
        this.collectionId,
        queries
      );

      const total = await this.getTotalTicketCount(userId, status);

      return {
        tickets: tickets.documents.map(doc => this.mapAppwriteDocumentToTicket(doc)),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new BadRequestException(`Failed to fetch tickets: ${error.message}`);
    }
  }

  private validateTicketRequest(request: CreateTicketRequest): void {
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
  }

  private calculateEstimatedResponseTime(priority: string): string {
    switch (priority) {
      case 'urgent':
        return '2-4 hours';
      case 'high':
        return '4-8 hours';
      case 'medium':
        return '8-24 hours';
      case 'low':
        return '24-48 hours';
      default:
        return '24-48 hours';
    }
  }

  private async sendTicketConfirmationEmail(
    userId: string,
    ticketId: string,
    request: CreateTicketRequest
  ): Promise<void> {
    try {
      const user = await this.appwriteService.getAccount().get();
      
      await this.emailService.sendEmail({
        to: user.email,
        subject: `Support Ticket Created - #${ticketId}`,
        html: `
          <h2>Support Ticket Created</h2>
          <p><strong>Ticket ID:</strong> #${ticketId}</p>
          <p><strong>Type:</strong> ${request.type}</p>
          <p><strong>Priority:</strong> ${request.priority}</p>
          <p><strong>Description:</strong> ${request.description}</p>
          <p><strong>Estimated Response Time:</strong> ${this.calculateEstimatedResponseTime(request.priority)}</p>
          <p><strong>Support Email:</strong> support@arzansite.com</p>
          <p><strong>Support Phone:</strong> +98-21-12345678</p>
        `,
        text: `Support Ticket Created - #${ticketId}\nType: ${request.type}\nPriority: ${request.priority}\nDescription: ${request.description}\nEstimated Response Time: ${this.calculateEstimatedResponseTime(request.priority)}\nSupport Email: support@arzansite.com\nSupport Phone: +98-21-12345678`,
      });
    } catch (error) {
      // Log error but don't fail the ticket creation
      console.error('Failed to send confirmation email:', error);
    }
  }

  private async notifySupportTeam(
    ticketId: string,
    action: string,
    userId: string
  ): Promise<void> {
    try {
      // This would typically send a notification to the support team
      // For now, we'll just log it
      console.log(`Support team notification: ${action} on ticket ${ticketId} by user ${userId}`);
    } catch (error) {
      console.error('Failed to notify support team:', error);
    }
  }

  private async notifyUserAboutStatusChange(
    userId: string,
    ticketId: string,
    status: string
  ): Promise<void> {
    try {
      const user = await this.appwriteService.getAccount().get();
      
      await this.emailService.sendEmail({
        to: user.email,
        subject: `Support Ticket Status Updated - #${ticketId}`,
        html: `
          <h2>Support Ticket Status Updated</h2>
          <p><strong>Ticket ID:</strong> #${ticketId}</p>
          <p><strong>New Status:</strong> ${status}</p>
          <p><strong>Support Email:</strong> support@arzansite.com</p>
        `,
        text: `Support Ticket Status Updated - #${ticketId}\nNew Status: ${status}\nSupport Email: support@arzansite.com`,
      });
    } catch (error) {
      console.error('Failed to send status update email:', error);
    }
  }

  private async getTotalTicketCount(userId: string, status?: string): Promise<number> {
    try {
      const queries = [Query.equal('user_id', userId)];
      
      if (status) {
        queries.push(Query.equal('status', status));
      }

      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      
      const result = await databases.listDocuments(
        databaseId,
        this.collectionId,
        queries
      );

      return result.total;
    } catch (error) {
      return 0;
    }
  }

  private mapAppwriteDocumentToTicket(doc: any): SupportTicket {
    return {
      id: doc.$id,
      userId: doc.user_id,
      type: doc.type,
      orderId: doc.orderId,
      transactionId: doc.transactionId,
      description: doc.description,
      priority: doc.priority,
      status: doc.status,
      attachments: doc.attachments || [],
      contactPreference: doc.contactPreference,
      userAgent: doc.userAgent,
      ipAddress: doc.ipAddress,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      estimatedResolution: doc.estimatedResolution,
      assignedTo: doc.assignedTo,
      messages: doc.messages || [],
    };
  }
}
