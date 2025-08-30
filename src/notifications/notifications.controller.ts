import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { NotificationsService, NotificationRequest, NotificationPreferences } from './notifications.service';
import { JwtGuard } from '../common/guards/jwt.guard';
import { User, UserPayload } from '../common/decorators/user.decorator';
import { AppwriteService } from '../appwrite/appwrite.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtGuard)
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly appwriteService: AppwriteService,
    private readonly configService: ConfigService,
  ) {}

  @Post('order-status')
  @ApiOperation({
    summary: 'Send Order Status Notification',
    description: 'Sends order status notifications through multiple channels',
  })
  @ApiBody({
    schema: {
      example: {
        orderId: 'order_123',
        userId: 'user_123',
        notificationType: 'order_created',
        message: 'Your order has been created successfully',
        priority: 'medium',
        channels: ['email', 'dashboard'],
        metadata: {
          order_title: 'Website Design',
          amount: 5000000,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Order status notification sent successfully',
    schema: {
      example: {
        success: true,
        notificationId: 'notif_123',
        sentChannels: ['email', 'dashboard'],
        failedChannels: [],
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid notification request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sendOrderStatusNotification(
    @Body() notificationRequest: NotificationRequest
  ) {
    this.logger.log(`Sending order status notification for order ${notificationRequest.orderId}`);

    if (!notificationRequest.orderId || !notificationRequest.userId || !notificationRequest.message) {
      throw new BadRequestException('orderId, userId, and message are required');
    }

    return this.notificationsService.sendOrderStatusNotification(notificationRequest);
  }

  @Get('preferences')
  @ApiOperation({
    summary: 'Get Notification Preferences',
    description: 'Retrieves user\'s notification preferences and settings',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification preferences retrieved successfully',
    schema: {
      example: {
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
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getNotificationPreferences(@User() user: UserPayload) {
    this.logger.log(`Getting notification preferences for user ${user.id}`);
    return this.notificationsService.getUserNotificationPreferences(user.id);
  }

  @Put('preferences')
  @ApiOperation({
    summary: 'Update Notification Preferences',
    description: 'Updates user\'s notification preferences and settings',
  })
  @ApiBody({
    schema: {
      example: {
        email: {
          order_updates: true,
          payment_notifications: false,
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
          auto_refresh: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Notification preferences updated successfully',
    schema: {
      example: {
        email: {
          order_updates: true,
          payment_notifications: false,
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
          auto_refresh: true,
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid preferences data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateNotificationPreferences(
    @User() user: UserPayload,
    @Body() preferences: Partial<NotificationPreferences>
  ) {
    this.logger.log(`Updating notification preferences for user ${user.id}`);
    return this.notificationsService.updateNotificationPreferences(user.id, preferences);
  }

  @Get('history')
  @ApiOperation({
    summary: 'Get Notification History',
    description: 'Retrieves user\'s notification history with filtering and pagination',
  })
  @ApiQuery({ name: 'type', required: false, description: 'Notification type filter' })
  @ApiQuery({ name: 'status', required: false, description: 'Notification status filter' })
  @ApiQuery({ name: 'from_date', required: false, description: 'Start date filter (ISO format)' })
  @ApiQuery({ name: 'to_date', required: false, description: 'End date filter (ISO format)' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 20)' })
  @ApiResponse({
    status: 200,
    description: 'Notification history retrieved successfully',
    schema: {
      example: {
        notifications: [
          {
            id: 'notif_123',
            notification_type: 'order_created',
            message: 'Your order has been created successfully',
            priority: 'medium',
            channels: ['email', 'dashboard'],
            status: 'sent',
            created_at: '2024-01-01T00:00:00.000Z',
            read_at: null,
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
  async getNotificationHistory(
    @User() user: UserPayload,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('from_date') from_date?: string,
    @Query('to_date') to_date?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    this.logger.log(`Getting notification history for user ${user.id}`);

    // Validate date formats if provided
    if (from_date && !this.isValidISODate(from_date)) {
      throw new BadRequestException('from_date must be in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)');
    }

    if (to_date && !this.isValidISODate(to_date)) {
      throw new BadRequestException('to_date must be in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)');
    }

    return this.notificationsService.getNotificationHistory(user.id, {
      type,
      status,
      from_date,
      to_date,
      page,
      limit,
    });
  }

  @Put(':notificationId/read')
  @ApiOperation({
    summary: 'Mark Notification as Read',
    description: 'Marks a specific notification as read',
  })
  @ApiParam({ name: 'notificationId', description: 'Notification ID' })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read successfully',
    schema: {
      example: {
        success: true,
        message: 'Notification marked as read',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid notification ID' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Notification not found' })
  async markNotificationAsRead(
    @Param('notificationId') notificationId: string,
    @User() user: UserPayload
  ) {
    this.logger.log(`Marking notification ${notificationId} as read for user ${user.id}`);

    if (!notificationId) {
      throw new BadRequestException('Notification ID is required');
    }

    await this.notificationsService.markNotificationAsRead(notificationId, user.id);

    return {
      success: true,
      message: 'Notification marked as read',
    };
  }

  @Put('read-all')
  @ApiOperation({
    summary: 'Mark All Notifications as Read',
    description: 'Marks all unread notifications as read for the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read successfully',
    schema: {
      example: {
        success: true,
        message: 'All notifications marked as read',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async markAllNotificationsAsRead(@User() user: UserPayload) {
    this.logger.log(`Marking all notifications as read for user ${user.id}`);

    await this.notificationsService.markAllNotificationsAsRead(user.id);

    return {
      success: true,
      message: 'All notifications marked as read',
    };
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Get Unread Notification Count',
    description: 'Retrieves the count of unread notifications for the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'Unread notification count retrieved successfully',
    schema: {
      example: {
        unreadCount: 5,
        totalNotifications: 25,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUnreadNotificationCount(@User() user: UserPayload) {
    this.logger.log(`Getting unread notification count for user ${user.id}`);

    try {
      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const notificationsCollection = this.configService.get<string>('APPWRITE_COLLECTION_NOTIFICATIONS');
      const { Query } = await import('node-appwrite');

      // Get total notifications count
      const totalResult = await databases.listDocuments(databaseId, notificationsCollection, [
        Query.equal('user_id', user.id),
      ]);

      // Get unread notifications count
      const unreadResult = await databases.listDocuments(databaseId, notificationsCollection, [
        Query.equal('user_id', user.id),
        Query.isNull('read_at'),
      ]);

      return {
        unreadCount: unreadResult.total,
        totalNotifications: totalResult.total,
      };
    } catch (error) {
      this.logger.error(`Failed to get unread notification count: ${error.message}`);
      return {
        unreadCount: 0,
        totalNotifications: 0,
      };
    }
  }

  @Post('test')
  @ApiOperation({
    summary: 'Send Test Notification',
    description: 'Sends a test notification to verify notification system functionality',
  })
  @ApiBody({
    schema: {
      example: {
        channels: ['email', 'dashboard'],
        message: 'This is a test notification',
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Test notification sent successfully',
    schema: {
      example: {
        success: true,
        message: 'Test notification sent successfully',
        notificationId: 'test_notif_123',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid test notification request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sendTestNotification(
    @User() user: UserPayload,
    @Body() body: {
      channels: ('email' | 'dashboard')[];
      message: string;
    }
  ) {
    this.logger.log(`Sending test notification for user ${user.id}`);

    if (!body.channels || !body.message) {
      throw new BadRequestException('channels and message are required');
    }

    const testNotification: NotificationRequest = {
      orderId: 'test_order',
      userId: user.id,
      notificationType: 'order_created',
      message: body.message,
      priority: 'low',
      channels: body.channels,
      metadata: {
        test: true,
        timestamp: new Date().toISOString(),
      },
    };

    const result = await this.notificationsService.sendOrderStatusNotification(testNotification);

    return {
      success: result.success,
      message: 'Test notification sent successfully',
      notificationId: result.notificationId,
    };
  }

  @Get('channels/status')
  @ApiOperation({
    summary: 'Get Notification Channels Status',
    description: 'Retrieves the status of different notification channels for the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification channels status retrieved successfully',
    schema: {
      example: {
        email: {
          enabled: true,
          verified: true,
          lastSent: '2024-01-01T00:00:00.000Z',
        },
        sms: {
          enabled: false,
          verified: false,
          lastSent: null,
        },
        push: {
          enabled: true,
          verified: true,
          lastSent: '2024-01-01T00:00:00.000Z',
          deviceCount: 2,
        },
        dashboard: {
          enabled: true,
          lastSeen: '2024-01-01T00:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getNotificationChannelsStatus(@User() user: UserPayload) {
    this.logger.log(`Getting notification channels status for user ${user.id}`);

    try {
      const preferences = await this.notificationsService.getUserNotificationPreferences(user.id);
      
      // Get user profile information
      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const profilesCollection = this.configService.get<string>('APPWRITE_COLLECTION_PROFILES');
      const { Query } = await import('node-appwrite');

      const userProfile = await databases.listDocuments(databaseId, profilesCollection, [
        Query.equal('user_id', user.id),
        Query.limit(1),
      ]);

      // Get push tokens count
      const pushTokensCollection = this.configService.get<string>('APPWRITE_COLLECTION_PUSH_TOKENS');
      const pushTokens = await databases.listDocuments(databaseId, pushTokensCollection, [
        Query.equal('user_id', user.id),
        Query.equal('active', true),
      ]);

      // Get last notification sent for each channel
      const notificationsCollection = this.configService.get<string>('APPWRITE_COLLECTION_NOTIFICATIONS');
      const lastNotifications = await databases.listDocuments(databaseId, notificationsCollection, [
        Query.equal('user_id', user.id),
        Query.orderDesc('created_at'),
        Query.limit(100), // Get last 100 to analyze channel usage
      ]);

      const channelStatus = {
        email: {
          enabled: preferences.email.order_updates || preferences.email.payment_notifications,
          verified: userProfile.documents.length > 0 && userProfile.documents[0].email,
          lastSent: this.getLastNotificationForChannel(lastNotifications.documents, 'email'),
        },
        sms: {
          enabled: preferences.sms.order_updates || preferences.sms.payment_notifications,
          verified: userProfile.documents.length > 0 && userProfile.documents[0].phone,
          lastSent: this.getLastNotificationForChannel(lastNotifications.documents, 'sms'),
        },
        push: {
          enabled: preferences.push.order_updates || preferences.push.payment_notifications,
          verified: pushTokens.total > 0,
          lastSent: this.getLastNotificationForChannel(lastNotifications.documents, 'push'),
          deviceCount: pushTokens.total,
        },
        dashboard: {
          enabled: preferences.dashboard.show_notifications,
          lastSeen: this.getLastDashboardActivity(user.id),
        },
      };

      return channelStatus;
    } catch (error) {
      this.logger.error(`Failed to get notification channels status: ${error.message}`);
      throw new BadRequestException('Failed to get notification channels status');
    }
  }

  // Private helper methods
  private isValidISODate(dateString: string): boolean {
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    return isoDateRegex.test(dateString) && !isNaN(Date.parse(dateString));
  }

  private getLastNotificationForChannel(notifications: any[], channel: string): string | null {
    const channelNotifications = notifications.filter(notification => 
      notification.channels && notification.channels.includes(channel)
    );

    if (channelNotifications.length === 0) {
      return null;
    }

    // Sort by created_at and return the most recent
    const sortedNotifications = channelNotifications.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return sortedNotifications[0].created_at;
  }

  private async getLastDashboardActivity(userId: string): Promise<string | null> {
    try {
      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const userActivityCollection = this.configService.get<string>('APPWRITE_COLLECTION_USER_ACTIVITY');
      const { Query } = await import('node-appwrite');

      const result = await databases.listDocuments(databaseId, userActivityCollection, [
        Query.equal('user_id', userId),
        Query.equal('activity_type', 'dashboard_login'),
        Query.orderDesc('created_at'),
        Query.limit(1),
      ]);

      return result.documents.length > 0 ? result.documents[0].created_at : null;
    } catch (error) {
      this.logger.warn(`Failed to get last dashboard activity: ${error.message}`);
      return null;
    }
  }
}
