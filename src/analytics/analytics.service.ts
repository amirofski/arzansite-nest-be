import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppwriteService } from '../appwrite/appwrite.service';
import { Query } from 'node-appwrite';

export interface OrderAnalytics {
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  orderStatusDistribution: Record<string, number>;
  paymentMethodDistribution: Record<string, number>;
  monthlyTrends: Record<string, number>;
  topServices: Record<string, number>;
}

export interface WalletTransactionAnalytics {
  totalTransactions: number;
  totalVolume: number;
  averageTransactionValue: number;
  transactionTypeDistribution: Record<string, number>;
  monthlyTrends: Record<string, number>;
  topTransactionSources: Record<string, number>;
}

export interface UserBehaviorAnalytics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  userRetentionRate: number;
  averageSessionDuration: number;
  topUserActions: Record<string, number>;
  userEngagementScore: number;
}

export interface RevenueAnalytics {
  totalRevenue: number;
  monthlyRevenue: Record<string, number>;
  revenueGrowth: number;
  topRevenueSources: Record<string, number>;
  revenueByService: Record<string, number>;
  averageOrderValue: number;
  customerLifetimeValue: number;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly appwriteService: AppwriteService,
    private readonly configService: ConfigService,
  ) {}

  async getUserOrderAnalytics(
    user_id: string,
    period: string = '30d',
    groupBy: string = 'day'
  ): Promise<OrderAnalytics> {
    try {
      this.logger.log(`Getting order analytics for user ${user_id}, period: ${period}, groupBy: ${groupBy}`);
      
      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const ordersCollection = this.configService.get<string>('APPWRITE_COLLECTION_ORDERS');
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      const ordersQuery = [
        Query.equal('user_id', user_id),
        Query.greaterThanEqual('created_at', startDate.toISOString()),
        Query.lessThanEqual('created_at', endDate.toISOString()),
      ];

      const orders = await databases.listDocuments(
        databaseId,
        ordersCollection,
        ordersQuery
      );
      
      // Process orders data
      const analytics = this.processOrderData(orders.documents, groupBy);
      
      this.logger.log(`Order analytics calculated successfully for user ${user_id}`);
      return analytics;
      
    } catch (error) {
      this.logger.error(`Failed to get order analytics for user ${user_id}: ${error.message}`);
      throw error;
    }
  }

  async getWalletTransactionAnalytics(
    user_id: string,
    period: string = '30d',
    type?: string
  ): Promise<WalletTransactionAnalytics> {
    try {
      this.logger.log(`Getting wallet transaction analytics for user ${user_id}, period: ${period}, type: ${type}`);
      
      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const transactionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_TRANSACTIONS');
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      const queryFilters = [
        Query.equal('user_id', user_id),
        Query.greaterThanEqual('created_at', startDate.toISOString()),
        Query.lessThanEqual('created_at', endDate.toISOString()),
      ];

      if (type) {
        queryFilters.push(Query.equal('type', type));
      }

      const transactions = await databases.listDocuments(
        databaseId,
        transactionsCollection,
        queryFilters
      );
      
      // Process transactions data
      const analytics = this.processWalletTransactionData(transactions.documents);
      
      this.logger.log(`Wallet transaction analytics calculated successfully for user ${user_id}`);
      return analytics;
      
    } catch (error) {
      this.logger.error(`Failed to get wallet transaction analytics for user ${user_id}: ${error.message}`);
      throw error;
    }
  }

  async getUserBehaviorAnalytics(
    user_id: string,
    period: string = '30d'
  ): Promise<UserBehaviorAnalytics> {
    try {
      this.logger.log(`Getting user behavior analytics for user ${user_id}, period: ${period}`);
      
      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const userActivityCollection = this.configService.get<string>('APPWRITE_COLLECTION_USER_ACTIVITY');
      const profilesCollection = this.configService.get<string>('APPWRITE_COLLECTION_PROFILES');
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      // Get user activity
      const userActivity = await databases.listDocuments(
        databaseId,
        userActivityCollection,
        [
          Query.equal('user_id', user_id),
          Query.greaterThanEqual('created_at', startDate.toISOString()),
          Query.lessThanEqual('created_at', endDate.toISOString()),
        ],
      );

      // Get user profile
      const userProfile = await databases.listDocuments(
        databaseId,
        profilesCollection,
        [
          Query.equal('user_id', user_id),
          Query.limit(1),
        ],
      );

      // Process behavior data
      const analytics = this.processUserBehaviorData(userActivity.documents, userProfile.documents[0]);
      
      this.logger.log(`User behavior analytics calculated successfully for user ${user_id}`);
      return analytics;
      
    } catch (error) {
      this.logger.error(`Failed to get user behavior analytics for user ${user_id}: ${error.message}`);
      throw error;
    }
  }

  async getRevenueAnalytics(
    user_id: string,
    period: string = '30d'
  ): Promise<RevenueAnalytics> {
    try {
      this.logger.log(`Getting revenue analytics for user ${user_id}, period: ${period}`);
      
      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const ordersCollection = this.configService.get<string>('APPWRITE_COLLECTION_ORDERS');
      
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      const ordersQuery = [
        Query.equal('user_id', user_id),
        Query.equal('status', 'completed'),
        Query.greaterThanEqual('created_at', startDate.toISOString()),
        Query.lessThanEqual('created_at', endDate.toISOString()),
      ];

      const orders = await databases.listDocuments(
        databaseId,
        ordersCollection,
        ordersQuery
      );
      
      // Process revenue data
      const analytics = this.processRevenueData(orders.documents);
      
      this.logger.log(`Revenue analytics calculated successfully for user ${user_id}`);
      return analytics;
      
    } catch (error) {
      this.logger.error(`Failed to get revenue analytics for user ${user_id}: ${error.message}`);
      throw error;
    }
  }

  async getDashboardAnalytics(user_id: string): Promise<{
    orders: OrderAnalytics;
    transactions: WalletTransactionAnalytics;
    behavior: UserBehaviorAnalytics;
    revenue: RevenueAnalytics;
  }> {
    try {
      this.logger.log(`Getting comprehensive dashboard analytics for user ${user_id}`);
      
      const [
        orders,
        transactions,
        behavior,
        revenue
      ] = await Promise.all([
        this.getUserOrderAnalytics(user_id, '30d'),
        this.getWalletTransactionAnalytics(user_id, '30d'),
        this.getUserBehaviorAnalytics(user_id, '30d'),
        this.getRevenueAnalytics(user_id, '30d'),
      ]);

      return {
        orders,
        transactions,
        behavior,
        revenue
      };
      
    } catch (error) {
      this.logger.error(`Failed to get dashboard analytics for user ${user_id}: ${error.message}`);
      throw error;
    }
  }

  // Helper methods
  private processOrderData(documents: any[], groupBy: string): OrderAnalytics {
    // Simple processing for now
    return {
      totalOrders: documents.length,
      totalSpent: documents.reduce((sum, doc) => sum + (doc.total_amount || 0), 0),
      averageOrderValue: documents.length > 0 ? documents.reduce((sum, doc) => sum + (doc.total_amount || 0), 0) / documents.length : 0,
      orderStatusDistribution: {},
      paymentMethodDistribution: {},
      monthlyTrends: {},
      topServices: {},
    };
  }

  private processWalletTransactionData(documents: any[]): WalletTransactionAnalytics {
    return {
      totalTransactions: documents.length,
      totalVolume: documents.reduce((sum, doc) => sum + Math.abs(doc.amount || 0), 0),
      averageTransactionValue: documents.length > 0 ? documents.reduce((sum, doc) => sum + Math.abs(doc.amount || 0), 0) / documents.length : 0,
      transactionTypeDistribution: {},
      monthlyTrends: {},
      topTransactionSources: {},
    };
  }

  private processUserBehaviorData(activityDocs: any[], profileDoc: any): UserBehaviorAnalytics {
    return {
      totalUsers: 1,
      activeUsers: activityDocs.length > 0 ? 1 : 0,
      newUsers: profileDoc ? 1 : 0,
      userRetentionRate: 100,
      averageSessionDuration: 0,
      topUserActions: {},
      userEngagementScore: 0,
    };
  }

  private processRevenueData(documents: any[]): RevenueAnalytics {
    return {
      totalRevenue: documents.reduce((sum, doc) => sum + (doc.total_amount || 0), 0),
      monthlyRevenue: {},
      revenueGrowth: 0,
      topRevenueSources: {},
      revenueByService: {},
      averageOrderValue: documents.length > 0 ? documents.reduce((sum, doc) => sum + (doc.total_amount || 0), 0) / documents.length : 0,
      customerLifetimeValue: documents.reduce((sum, doc) => sum + (doc.total_amount || 0), 0),
    };
  }
}
