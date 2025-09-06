import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppwriteService } from '../appwrite/appwrite.service';
import { EmailService } from '../email/email.service';
import { ID, Query } from 'node-appwrite';

export interface NotificationRequest {
  order_id: string;
  user_id: string;
  notificationType: 'order_created' | 'payment_success' | 'payment_failed' | 'progress_update' | 'order_completed';
  message: string;
  priority: 'low' | 'medium' | 'high';
  channels: ('email' | 'sms' | 'push' | 'dashboard')[];
  metadata?: Record<string, any>;
}

export interface NotificationResponse {
  success: boolean;
  notificationId: string;
  sentChannels: string[];
  failedChannels: string[];
}

export interface NotificationPreferences {
  email: {
    order_updates: boolean;
    payment_notifications: boolean;
    progress_updates: boolean;
    marketing: boolean;
  };
  sms: {
    order_updates: boolean;
    payment_notifications: boolean;
    progress_updates: boolean;
  };
  push: {
    order_updates: boolean;
    payment_notifications: boolean;
    progress_updates: boolean;
  };
  dashboard: {
    show_notifications: boolean;
    auto_refresh: boolean;
  };
}

export interface NotificationTemplate {
  subject: string;
  html: string;
  text: string;
  sms?: string;
  push?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly appwriteService: AppwriteService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async sendOrderStatusNotification(notificationRequest: NotificationRequest): Promise<NotificationResponse> {
    this.logger.log(`Sending order status notification for order ${notificationRequest.order_id}, user ${notificationRequest.user_id}`);

    try {
      // Validate notification request
      this.validateNotificationRequest(notificationRequest);

      // Get user notification preferences
      const userPreferences = await this.getUserNotificationPreferences(notificationRequest.user_id);

      // Create notification record
      const notificationId = await this.createNotificationRecord(notificationRequest);

      // Send notifications through enabled channels
      const sentChannels: string[] = [];
      const failedChannels: string[] = [];

      for (const channel of notificationRequest.channels) {
        if (this.isChannelEnabled(channel, notificationRequest.notificationType, userPreferences)) {
          try {
            await this.sendNotificationThroughChannel(channel, notificationRequest, userPreferences);
            sentChannels.push(channel);
          } catch (error) {
            this.logger.error(`Failed to send notification through ${channel}: ${error.message}`);
            failedChannels.push(channel);
          }
        }
      }

      // Update notification status
      await this.updateNotificationStatus(notificationId, sentChannels, failedChannels);

      this.logger.log(`Order status notification sent successfully for order ${notificationRequest.order_id}`);

      return {
        success: sentChannels.length > 0,
        notificationId,
        sentChannels,
        failedChannels,
      };
    } catch (error) {
      this.logger.error(`Failed to send order status notification: ${error.message}`);
      throw new BadRequestException(`Notification failed: ${error.message}`);
    }
  }

  async getUserNotificationPreferences(user_id: string): Promise<NotificationPreferences> {
    this.logger.log(`Getting notification preferences for user ${user_id}`);

    try {
      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const preferencesCollection = this.configService.get<string>('APPWRITE_COLLECTION_NOTIFICATION_PREFERENCES');

      const result = await databases.listDocuments(
        databaseId,
        preferencesCollection,
        [
          Query.equal('user_id', user_id),
          Query.limit(1),
        ],
      );

      if (result.documents.length > 0) {
        return this.mapToNotificationPreferences(result.documents[0]);
      }

      // Return default preferences if none exist
      return this.getDefaultNotificationPreferences();
    } catch (error) {
      this.logger.warn(`Failed to get user notification preferences: ${error.message}`);
      return this.getDefaultNotificationPreferences();
    }
  }

  async updateNotificationPreferences(
    user_id: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    this.logger.log(`Updating notification preferences for user ${user_id}`);

    try {
      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const preferencesCollection = this.configService.get<string>('APPWRITE_COLLECTION_NOTIFICATION_PREFERENCES');

      const existingPreferences = await databases.listDocuments(
        databaseId,
        preferencesCollection,
        [
          Query.equal('user_id', user_id),
          Query.limit(1),
        ],
      );

      if (existingPreferences.documents.length > 0) {
        // Update existing preferences
        const updatedPreferences = await databases.updateDocument(
          databaseId,
          preferencesCollection,
          existingPreferences.documents[0].$id,
          {
            ...this.mapToDatabaseFormat(preferences),
            updated_at: new Date().toISOString(),
          },
        );

        return this.mapToNotificationPreferences(updatedPreferences);
      } else {
        // Create new preferences
        const newPreferences = await databases.createDocument(
          databaseId,
          preferencesCollection,
          ID.unique(),
          {
            user_id: user_id,
            ...this.mapToDatabaseFormat(preferences),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        );

        return this.mapToNotificationPreferences(newPreferences);
      }
    } catch (error) {
      this.logger.error(`Failed to update notification preferences: ${error.message}`);
      throw new BadRequestException(`Failed to update preferences: ${error.message}`);
    }
  }

  async getNotificationHistory(
    user_id: string,
    filters: {
      type?: string;
      status?: string;
      from_date?: string;
      to_date?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    notifications: any[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    this.logger.log(`Getting notification history for user ${user_id}`);

    try {
      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const notificationsCollection = this.configService.get<string>('APPWRITE_COLLECTION_NOTIFICATIONS');

      // Build query filters
      const queryFilters = [Query.equal('user_id', user_id)];
      
      if (filters.type) {
        queryFilters.push(Query.equal('notification_type', filters.type));
      }
      
      if (filters.status) {
        queryFilters.push(Query.equal('status', filters.status));
      }
      
      if (filters.from_date) {
        queryFilters.push(Query.greaterThanEqual('created_at', filters.from_date));
      }
      
      if (filters.to_date) {
        queryFilters.push(Query.lessThanEqual('created_at', filters.to_date));
      }

      // Add pagination
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const offset = (page - 1) * limit;

      queryFilters.push(Query.orderDesc('created_at'));
      queryFilters.push(Query.limit(limit));
      queryFilters.push(Query.offset(offset));

      // Get notifications
      const result = await databases.listDocuments(
        databaseId,
        notificationsCollection,
        queryFilters,
      );

      // Get total count for pagination
      const totalResult = await databases.listDocuments(
        databaseId,
        notificationsCollection,
        [
          Query.equal('user_id', user_id),
        ],
      );

      const total = totalResult.total;
      const totalPages = Math.ceil(total / limit);

      return {
        notifications: result.documents,
        pagination: {
          total,
          page,
          limit,
          totalPages,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get notification history: ${error.message}`);
      throw new BadRequestException(`Failed to get notification history: ${error.message}`);
    }
  }

  async markNotificationAsRead(notificationId: string, user_id: string): Promise<void> {
    this.logger.log(`Marking notification ${notificationId} as read for user ${user_id}`);

    try {
      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const notificationsCollection = this.configService.get<string>('APPWRITE_COLLECTION_NOTIFICATIONS');

      const notification = await databases.listDocuments(
        databaseId,
        notificationsCollection,
        [
          Query.equal('$id', notificationId),
          Query.equal('user_id', user_id),
          Query.limit(1),
        ],
      );

      if (notification.documents.length > 0) {
        await databases.updateDocument(
          databaseId,
          notificationsCollection,
          notification.documents[0].$id,
          {
            read_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        );
      }
    } catch (error) {
      this.logger.error(`Failed to mark notification as read: ${error.message}`);
      throw new BadRequestException(`Failed to mark notification as read: ${error.message}`);
    }
  }

  async markAllNotificationsAsRead(user_id: string): Promise<void> {
    this.logger.log(`Marking all notifications as read for user ${user_id}`);

    try {
      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const notificationsCollection = this.configService.get<string>('APPWRITE_COLLECTION_NOTIFICATIONS');

      const unreadNotifications = await databases.listDocuments(
        databaseId,
        notificationsCollection,
        [
          Query.equal('user_id', user_id),
          Query.isNull('read_at'),
          Query.limit(100), // Limit to prevent overwhelming the system
        ],
      );

      for (const notification of unreadNotifications.documents) {
        await databases.updateDocument(
          databaseId,
          notificationsCollection,
          notification.$id,
          {
            read_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        );
      }
    } catch (error) {
      this.logger.error(`Failed to mark all notifications as read: ${error.message}`);
      throw new BadRequestException(`Failed to mark all notifications as read: ${error.message}`);
    }
  }

  // Private helper methods
  private validateNotificationRequest(notificationRequest: NotificationRequest): void {
    if (!notificationRequest.order_id || !notificationRequest.user_id || !notificationRequest.message) {
      throw new BadRequestException('order_id, user_id, and message are required');
    }

    if (!notificationRequest.channels || notificationRequest.channels.length === 0) {
      throw new BadRequestException('At least one notification channel must be specified');
    }

    if (!['low', 'medium', 'high'].includes(notificationRequest.priority)) {
      throw new BadRequestException('Priority must be low, medium, or high');
    }

    if (!['order_created', 'payment_success', 'payment_failed', 'progress_update', 'order_completed'].includes(notificationRequest.notificationType)) {
      throw new BadRequestException('Invalid notification type');
    }
  }

  private async createNotificationRecord(notificationRequest: NotificationRequest): Promise<string> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const notificationsCollection = this.configService.get<string>('APPWRITE_COLLECTION_NOTIFICATIONS');

    try {
      const document = await databases.createDocument(
        databaseId,
        notificationsCollection,
        ID.unique(),
        {
          user_id: notificationRequest.user_id,
          order_id: notificationRequest.order_id,
          notification_type: notificationRequest.notificationType,
          message: notificationRequest.message,
          priority: notificationRequest.priority,
          channels: notificationRequest.channels,
          metadata: notificationRequest.metadata ? JSON.stringify(notificationRequest.metadata) : null,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      );

      return document.$id;
    } catch (error) {
      this.logger.error(`Failed to create notification record: ${error.message}`);
      throw new BadRequestException('Failed to create notification record');
    }
  }

  private isChannelEnabled(
    channel: string,
    notificationType: string,
    preferences: NotificationPreferences
  ): boolean {
    switch (channel) {
      case 'email':
        return this.isEmailChannelEnabled(notificationType, preferences);
      case 'sms':
        return this.isSMSChannelEnabled(notificationType, preferences);
      case 'push':
        return this.isPushChannelEnabled(notificationType, preferences);
      case 'dashboard':
        return preferences.dashboard.show_notifications;
      default:
        return false;
    }
  }

  private isEmailChannelEnabled(notificationType: string, preferences: NotificationPreferences): boolean {
    switch (notificationType) {
      case 'order_created':
      case 'order_completed':
      case 'progress_update':
        return preferences.email.order_updates;
      case 'payment_success':
      case 'payment_failed':
        return preferences.email.payment_notifications;
      default:
        return false;
    }
  }

  private isSMSChannelEnabled(notificationType: string, preferences: NotificationPreferences): boolean {
    switch (notificationType) {
      case 'order_created':
      case 'order_completed':
      case 'progress_update':
        return preferences.sms.order_updates;
      case 'payment_success':
      case 'payment_failed':
        return preferences.sms.payment_notifications;
      default:
        return false;
    }
  }

  private isPushChannelEnabled(notificationType: string, preferences: NotificationPreferences): boolean {
    switch (notificationType) {
      case 'order_created':
      case 'order_completed':
      case 'progress_update':
        return preferences.push.order_updates;
      case 'payment_success':
      case 'payment_failed':
        return preferences.push.payment_notifications;
      default:
        return false;
    }
  }

  private async sendNotificationThroughChannel(
    channel: string,
    notificationRequest: NotificationRequest,
    preferences: NotificationPreferences
  ): Promise<void> {
    switch (channel) {
      case 'email':
        await this.sendEmailNotification(notificationRequest);
        break;
      case 'sms':
        await this.sendSMSNotification(notificationRequest);
        break;
      case 'push':
        await this.sendPushNotification(notificationRequest);
        break;
      case 'dashboard':
        await this.sendDashboardNotification(notificationRequest);
        break;
      default:
        throw new BadRequestException(`Unsupported notification channel: ${channel}`);
    }
  }

  private async sendEmailNotification(notificationRequest: NotificationRequest): Promise<void> {
    try {
      // Get user email
      const userEmail = await this.getUserEmail(notificationRequest.user_id);
      if (!userEmail) {
        throw new Error('User email not found');
      }

      // Get notification template
      const template = this.getNotificationTemplate(notificationRequest);

      // Send email
      await this.emailService.sendEmail({
        to: userEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
    } catch (error) {
      this.logger.error(`Failed to send email notification: ${error.message}`);
      throw error;
    }
  }

  private async sendSMSNotification(notificationRequest: NotificationRequest): Promise<void> {
    try {
      // Get user phone number
      const userPhone = await this.getUserPhone(notificationRequest.user_id);
      if (!userPhone) {
        throw new Error('User phone number not found');
      }

      // Get notification template
      const template = this.getNotificationTemplate(notificationRequest);

      // Send SMS (this would integrate with an SMS service)
      this.logger.log(`SMS notification sent to ${userPhone}: ${template.sms || template.text}`);
    } catch (error) {
      this.logger.error(`Failed to send SMS notification: ${error.message}`);
      throw error;
    }
  }

  private async sendPushNotification(notificationRequest: NotificationRequest): Promise<void> {
    try {
      // Get user push tokens
      const pushTokens = await this.getUserPushTokens(notificationRequest.user_id);
      if (!pushTokens || pushTokens.length === 0) {
        throw new Error('User push tokens not found');
      }

      // Get notification template
      const template = this.getNotificationTemplate(notificationRequest);

      // Send push notification (this would integrate with a push notification service)
      this.logger.log(`Push notification sent to ${pushTokens.length} devices: ${template.push || template.text}`);
    } catch (error) {
      this.logger.error(`Failed to send push notification: ${error.message}`);
      throw error;
    }
  }

  private async sendDashboardNotification(notificationRequest: NotificationRequest): Promise<void> {
    try {
      // Dashboard notifications are stored in the database and retrieved by the frontend
      // No additional action needed here
      this.logger.log(`Dashboard notification stored for user ${notificationRequest.user_id}`);
    } catch (error) {
      this.logger.error(`Failed to send dashboard notification: ${error.message}`);
      throw error;
    }
  }

  private async getUserEmail(user_id: string): Promise<string | null> {
    try {
      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const profilesCollection = this.configService.get<string>('APPWRITE_COLLECTION_PROFILES');

      const result = await databases.listDocuments(
        databaseId,
        profilesCollection,
        [
          Query.equal('user_id', user_id),
          Query.limit(1),
        ],
      );

      return result.documents.length > 0 ? result.documents[0].email : null;
    } catch (error) {
      this.logger.warn(`Failed to get user email: ${error.message}`);
      return null;
    }
  }

  private async getUserPhone(user_id: string): Promise<string | null> {
    try {
      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const profilesCollection = this.configService.get<string>('APPWRITE_COLLECTION_PROFILES');

      const result = await databases.listDocuments(
        databaseId,
        profilesCollection,
        [
          Query.equal('user_id', user_id),
          Query.limit(1),
        ],
      );

      return result.documents.length > 0 ? result.documents[0].phone : null;
    } catch (error) {
      this.logger.warn(`Failed to get user phone: ${error.message}`);
      return null;
    }
  }

  private async getUserPushTokens(user_id: string): Promise<string[] | null> {
    try {
      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const pushTokensCollection = this.configService.get<string>('APPWRITE_COLLECTION_PUSH_TOKENS');

      const result = await databases.listDocuments(
        databaseId,
        pushTokensCollection,
        [
          Query.equal('user_id', user_id),
          Query.equal('active', true),
        ],
      );

      return result.documents.map(doc => doc.token);
    } catch (error) {
      this.logger.warn(`Failed to get user push tokens: ${error.message}`);
      return null;
    }
  }

  private getNotificationTemplate(notificationRequest: NotificationRequest): NotificationTemplate {
    const baseMessage = notificationRequest.message;
    
    switch (notificationRequest.notificationType) {
      case 'order_created':
        return {
          subject: 'New Order Created',
          html: `<h2>New Order Created</h2><p>${baseMessage}</p>`,
          text: `New Order Created: ${baseMessage}`,
          sms: `New order: ${baseMessage}`,
          push: `New order created`,
        };
      case 'payment_success':
        return {
          subject: 'Payment Successful',
          html: `<h2>Payment Successful</h2><p>${baseMessage}</p>`,
          text: `Payment Successful: ${baseMessage}`,
          sms: `Payment success: ${baseMessage}`,
          push: `Payment successful`,
        };
      case 'payment_failed':
        return {
          subject: 'Payment Failed',
          html: `<h2>Payment Failed</h2><p>${baseMessage}</p>`,
          text: `Payment Failed: ${baseMessage}`,
          sms: `Payment failed: ${baseMessage}`,
          push: `Payment failed`,
        };
      case 'progress_update':
        return {
          subject: 'Order Progress Update',
          html: `<h2>Order Progress Update</h2><p>${baseMessage}</p>`,
          text: `Order Progress Update: ${baseMessage}`,
          sms: `Progress update: ${baseMessage}`,
          push: `Order progress update`,
        };
      case 'order_completed':
        return {
          subject: 'Order Completed',
          html: `<h2>Order Completed</h2><p>${baseMessage}</p>`,
          text: `Order Completed: ${baseMessage}`,
          sms: `Order completed: ${baseMessage}`,
          push: `Order completed`,
        };
      default:
        return {
          subject: 'Notification',
          html: `<p>${baseMessage}</p>`,
          text: baseMessage,
          sms: baseMessage,
          push: 'New notification',
        };
    }
  }

  private async updateNotificationStatus(
    notificationId: string,
    sentChannels: string[],
    failedChannels: string[]
  ): Promise<void> {
    try {
      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const notificationsCollection = this.configService.get<string>('APPWRITE_COLLECTION_NOTIFICATIONS');

      const status = failedChannels.length === 0 ? 'sent' : 
                    sentChannels.length === 0 ? 'failed' : 'partially_sent';

      await databases.updateDocument(
        databaseId,
        notificationsCollection,
        notificationId,
        {
          status,
          sent_channels: sentChannels,
          failed_channels: failedChannels,
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      );
    } catch (error) {
      this.logger.warn(`Failed to update notification status: ${error.message}`);
    }
  }

  private mapToNotificationPreferences(dbDocument: any): NotificationPreferences {
    return {
      email: {
        order_updates: dbDocument.email?.order_updates ?? true,
        payment_notifications: dbDocument.email?.payment_notifications ?? true,
        progress_updates: dbDocument.email?.progress_updates ?? true,
        marketing: dbDocument.email?.marketing ?? false,
      },
      sms: {
        order_updates: dbDocument.sms?.order_updates ?? false,
        payment_notifications: dbDocument.sms?.payment_notifications ?? true,
        progress_updates: dbDocument.sms?.progress_updates ?? false,
      },
      push: {
        order_updates: dbDocument.push?.order_updates ?? true,
        payment_notifications: dbDocument.push?.payment_notifications ?? true,
        progress_updates: dbDocument.push?.progress_updates ?? true,
      },
      dashboard: {
        show_notifications: dbDocument.dashboard?.show_notifications ?? true,
        auto_refresh: dbDocument.dashboard?.auto_refresh ?? false,
      },
    };
  }

  private mapToDatabaseFormat(preferences: Partial<NotificationPreferences>): any {
    return {
      email: preferences.email ? JSON.stringify(preferences.email) : null,
      sms: preferences.sms ? JSON.stringify(preferences.sms) : null,
      push: preferences.push ? JSON.stringify(preferences.push) : null,
      dashboard: preferences.dashboard ? JSON.stringify(preferences.dashboard) : null,
    };
  }

  private getDefaultNotificationPreferences(): NotificationPreferences {
    return {
      email: {
        order_updates: true,
        payment_notifications: true,
        progress_updates: true,
        marketing: false,
      },
      sms: {
        order_updates: false,
        payment_notifications: true,
        progress_updates: false,
      },
      push: {
        order_updates: true,
        payment_notifications: true,
        progress_updates: true,
      },
      dashboard: {
        show_notifications: true,
        auto_refresh: false,
      },
    };
  }
}
