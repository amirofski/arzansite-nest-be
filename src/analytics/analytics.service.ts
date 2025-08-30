import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppwriteService } from '../appwrite/appwrite.service';
import { ID } from 'node-appwrite';

export interface OrderAnalytics {
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  orderStatusDistribution: Record<string, number>;
  paymentMethodDistribution: Record<string, number>;
  monthlyTrends: Array<{
    month: string;
    orders: number;
    revenue: number;
  }>;
  topServices: Array<{
    service: string;
    count: number;
    revenue: number;
  }>;
}

export interface WalletTransactionAnalytics {
  totalTransactions: number;
  totalVolume: number;
  averageTransactionValue: number;
  transactionTypeDistribution: Record<string, number>;
  monthlyTrends: Array<{
    month: string;
    transactions: number;
    volume: number;
  }>;
  topTransactionSources: Array<{
    source: string;
    count: number;
    volume: number;
  }>;
}

export interface UserBehaviorAnalytics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  userRetentionRate: number;
  averageSessionDuration: number;
  topUserActions: Array<{
    action: string;
    count: number;
    uniqueUsers: number;
  }>;
  userEngagementScore: number;
}

export interface RevenueAnalytics {
  totalRevenue: number;
  monthlyRevenue: number;
  revenueGrowth: number;
  topRevenueSources: Array<{
    source: string;
    revenue: number;
    percentage: number;
  }>;
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
    userId: string,
    period: '7d' | '30d' | '90d' | '1y' | 'all' = '30d',
    groupBy: 'day' | 'week' | 'month' = 'month'
  ): Promise<OrderAnalytics> {
    this.logger.log(`Getting order analytics for user ${userId}, period: ${period}, groupBy: ${groupBy}`);

    try {
      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const ordersCollection = this.configService.get<string>('APPWRITE_COLLECTION_ORDERS');
      const { Query } = await import('node-appwrite');

      // Calculate date range
      const dateRange = this.calculateDateRange(period);
      
      // Get orders for the user in the specified period
      const ordersQuery = [
        Query.equal('user_id', userId),
        Query.greaterThanEqual('created_at', dateRange.startDate.toISOString()),
        Query.lessThanEqual('created_at', dateRange.endDate.toISOString()),
        Query.orderDesc('created_at'),
      ];

      const orders = await databases.listDocuments(databaseId, ordersCollection, ordersQuery);

      if (orders.documents.length === 0) {
        return this.getEmptyOrderAnalytics();
      }

      // Process orders data
      const processedOrders = orders.documents.map(order => ({
        id: order.$id,
        price: order.price || 0,
        status: order.status || 'unknown',
        payment_method: order.payment_method || 'unknown',
        created_at: order.created_at,
        wizard_data: order.wizard_data ? JSON.parse(order.wizard_data) : {},
      }));

      // Calculate analytics
      const totalOrders = processedOrders.length;
      const totalSpent = processedOrders.reduce((sum, order) => sum + order.price, 0);
      const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

      // Status distribution
      const orderStatusDistribution = this.calculateDistribution(processedOrders, 'status');
      
      // Payment method distribution
      const paymentMethodDistribution = this.calculateDistribution(processedOrders, 'payment_method');

      // Monthly trends
      const monthlyTrends = this.calculateMonthlyTrends(processedOrders, groupBy);

      // Top services
      const topServices = this.calculateTopServices(processedOrders);

      this.logger.log(`Order analytics calculated successfully for user ${userId}`);

      return {
        totalOrders,
        totalSpent,
        averageOrderValue,
        orderStatusDistribution,
        paymentMethodDistribution,
        monthlyTrends,
        topServices,
      };
    } catch (error) {
      this.logger.error(`Failed to get order analytics for user ${userId}: ${error.message}`);
      throw new BadRequestException(`Failed to get order analytics: ${error.message}`);
    }
  }

  async getWalletTransactionAnalytics(
    userId: string,
    period: '7d' | '30d' | '90d' | '1y' | 'all' = '30d',
    type?: string
  ): Promise<WalletTransactionAnalytics> {
    this.logger.log(`Getting wallet transaction analytics for user ${userId}, period: ${period}, type: ${type}`);

    try {
      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const transactionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_WALLET_TRANSACTIONS');
      const { Query } = await import('node-appwrite');

      // Calculate date range
      const dateRange = this.calculateDateRange(period);
      
      // Build query
      const queryFilters = [
        Query.equal('user_id', userId),
        Query.greaterThanEqual('created_at', dateRange.startDate.toISOString()),
        Query.lessThanEqual('created_at', dateRange.endDate.toISOString()),
        Query.orderDesc('created_at'),
      ];

      if (type) {
        queryFilters.push(Query.equal('type', type));
      }

      const transactions = await databases.listDocuments(databaseId, transactionsCollection, queryFilters);

      if (transactions.documents.length === 0) {
        return this.getEmptyWalletTransactionAnalytics();
      }

      // Process transactions data
      const processedTransactions = transactions.documents.map(transaction => ({
        id: transaction.$id,
        type: transaction.type || 'unknown',
        amount: transaction.amount || 0,
        status: transaction.status || 'unknown',
        reference_type: transaction.reference_type || 'unknown',
        created_at: transaction.created_at,
      }));

      // Calculate analytics
      const totalTransactions = processedTransactions.length;
      const totalVolume = processedTransactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
      const averageTransactionValue = totalTransactions > 0 ? totalVolume / totalTransactions : 0;

      // Transaction type distribution
      const transactionTypeDistribution = this.calculateDistribution(processedTransactions, 'type');

      // Monthly trends
      const monthlyTrends = this.calculateWalletMonthlyTrends(processedTransactions, 'month');

      // Top transaction sources
      const topTransactionSources = this.calculateTopTransactionSources(processedTransactions);

      this.logger.log(`Wallet transaction analytics calculated successfully for user ${userId}`);

      return {
        totalTransactions,
        totalVolume,
        averageTransactionValue,
        transactionTypeDistribution,
        monthlyTrends,
        topTransactionSources,
      };
    } catch (error) {
      this.logger.error(`Failed to get wallet transaction analytics for user ${userId}: ${error.message}`);
      throw new BadRequestException(`Failed to get wallet transaction analytics: ${error.message}`);
    }
  }

  async getUserBehaviorAnalytics(
    userId: string,
    period: '7d' | '30d' | '90d' | '1y' | 'all' = '30d'
  ): Promise<UserBehaviorAnalytics> {
    this.logger.log(`Getting user behavior analytics for user ${userId}, period: ${period}`);

    try {
      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const userActivityCollection = this.configService.get<string>('APPWRITE_COLLECTION_USER_ACTIVITY');
      const { Query } = await import('node-appwrite');

      // Calculate date range
      const dateRange = this.calculateDateRange(period);
      
      // Get user activity
      const userActivity = await databases.listDocuments(databaseId, userActivityCollection, [
        Query.equal('user_id', userId),
        Query.greaterThanEqual('created_at', dateRange.startDate.toISOString()),
        Query.lessThanEqual('created_at', dateRange.endDate.toISOString()),
        Query.orderDesc('created_at'),
      ]);

      // Get user profile
      const profilesCollection = this.configService.get<string>('APPWRITE_COLLECTION_PROFILES');
      const userProfile = await databases.listDocuments(databaseId, profilesCollection, [
        Query.equal('user_id', userId),
        Query.limit(1),
      ]);

      // Calculate analytics
      const totalUsers = 1; // Single user analytics
      const activeUsers = userActivity.documents.length > 0 ? 1 : 0;
      const newUsers = userProfile.documents.length > 0 ? 1 : 0;
      
      // Calculate user retention rate (simplified)
      const userRetentionRate = this.calculateUserRetentionRate(userActivity.documents);
      
      // Calculate average session duration
      const averageSessionDuration = this.calculateAverageSessionDuration(userActivity.documents);
      
      // Top user actions
      const topUserActions = this.calculateTopUserActions(userActivity.documents);
      
      // User engagement score
      const userEngagementScore = this.calculateUserEngagementScore(userActivity.documents);

      this.logger.log(`User behavior analytics calculated successfully for user ${userId}`);

      return {
        totalUsers,
        activeUsers,
        newUsers,
        userRetentionRate,
        averageSessionDuration,
        topUserActions,
        userEngagementScore,
      };
    } catch (error) {
      this.logger.error(`Failed to get user behavior analytics for user ${userId}: ${error.message}`);
      throw new BadRequestException(`Failed to get user behavior analytics: ${error.message}`);
    }
  }

  async getRevenueAnalytics(
    userId: string,
    period: '7d' | '30d' | '90d' | '1y' | 'all' = '30d'
  ): Promise<RevenueAnalytics> {
    this.logger.log(`Getting revenue analytics for user ${userId}, period: ${period}`);

    try {
      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const ordersCollection = this.configService.get<string>('APPWRITE_COLLECTION_ORDERS');
      const { Query } = await import('node-appwrite');

      // Calculate date range
      const dateRange = this.calculateDateRange(period);
      
      // Get orders for revenue calculation
      const orders = await databases.listDocuments(databaseId, ordersCollection, [
        Query.equal('user_id', userId),
        Query.equal('payment_status', 'succeeded'),
        Query.greaterThanEqual('created_at', dateRange.startDate.toISOString()),
        Query.lessThanEqual('created_at', dateRange.endDate.toISOString()),
        Query.orderDesc('created_at'),
      ]);

      if (orders.documents.length === 0) {
        return this.getEmptyRevenueAnalytics();
      }

      // Process orders data
      const processedOrders = orders.documents.map(order => ({
        id: order.$id,
        price: order.price || 0,
        created_at: order.created_at,
        wizard_data: order.wizard_data ? JSON.parse(order.wizard_data) : {},
      }));

      // Calculate revenue analytics
      const totalRevenue = processedOrders.reduce((sum, order) => sum + order.price, 0);
      const monthlyRevenue = this.calculateMonthlyRevenue(processedOrders);
      const revenueGrowth = this.calculateRevenueGrowth(processedOrders);
      
      // Top revenue sources
      const topRevenueSources = this.calculateTopRevenueSources(processedOrders);
      
      // Revenue by service
      const revenueByService = this.calculateRevenueByService(processedOrders);
      
      // Average order value
      const averageOrderValue = processedOrders.length > 0 ? totalRevenue / processedOrders.length : 0;
      
      // Customer lifetime value (simplified)
      const customerLifetimeValue = totalRevenue;

      this.logger.log(`Revenue analytics calculated successfully for user ${userId}`);

      return {
        totalRevenue,
        monthlyRevenue,
        revenueGrowth,
        topRevenueSources,
        revenueByService,
        averageOrderValue,
        customerLifetimeValue,
      };
    } catch (error) {
      this.logger.error(`Failed to get revenue analytics for user ${userId}: ${error.message}`);
      throw new BadRequestException(`Failed to get revenue analytics: ${error.message}`);
    }
  }

  async getDashboardAnalytics(userId: string): Promise<{
    orders: OrderAnalytics;
    wallet: WalletTransactionAnalytics;
    behavior: UserBehaviorAnalytics;
    revenue: RevenueAnalytics;
  }> {
    this.logger.log(`Getting comprehensive dashboard analytics for user ${userId}`);

    try {
      const [orders, wallet, behavior, revenue] = await Promise.all([
        this.getUserOrderAnalytics(userId, '30d'),
        this.getWalletTransactionAnalytics(userId, '30d'),
        this.getUserBehaviorAnalytics(userId, '30d'),
        this.getRevenueAnalytics(userId, '30d'),
      ]);

      return {
        orders,
        wallet,
        behavior,
        revenue,
      };
    } catch (error) {
      this.logger.error(`Failed to get dashboard analytics for user ${userId}: ${error.message}`);
      throw new BadRequestException(`Failed to get dashboard analytics: ${error.message}`);
    }
  }

  // Private helper methods
  private calculateDateRange(period: string): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    let startDate = new Date();

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
      case 'all':
        startDate = new Date(0); // Unix epoch
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    return { startDate, endDate };
  }

  private calculateDistribution<T>(items: T[], key: keyof T): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    items.forEach(item => {
      const value = String(item[key] || 'unknown');
      distribution[value] = (distribution[value] || 0) + 1;
    });

    return distribution;
  }

  private calculateMonthlyTrends<T extends { created_at: string; price?: number; amount?: number }>(
    items: T[],
    groupBy: 'day' | 'week' | 'month'
  ): Array<{ month: string; orders: number; revenue: number }> {
    const trends: Record<string, { orders: number; revenue: number }> = {};

    items.forEach(item => {
      const date = new Date(item.created_at);
      let key: string;

      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!trends[key]) {
        trends[key] = { orders: 0, revenue: 0 };
      }

      trends[key].orders += 1;
      trends[key].revenue += (item.price || item.amount || 0);
    });

    return Object.entries(trends)
      .map(([key, value]) => ({
        month: key,
        orders: value.orders,
        revenue: value.revenue,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  private calculateWalletMonthlyTrends<T extends { created_at: string; amount?: number }>(
    items: T[],
    groupBy: 'day' | 'week' | 'month'
  ): Array<{ month: string; transactions: number; volume: number }> {
    const trends: Record<string, { transactions: number; volume: number }> = {};

    items.forEach(item => {
      const date = new Date(item.created_at);
      let key: string;

      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!trends[key]) {
        trends[key] = { transactions: 0, volume: 0 };
      }

      trends[key].transactions += 1;
      trends[key].volume += Math.abs(item.amount || 0);
    });

    return Object.entries(trends)
      .map(([key, value]) => ({
        month: key,
        transactions: value.transactions,
        volume: value.volume,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  private calculateTopServices(orders: any[]): Array<{ service: string; count: number; revenue: number }> {
    const serviceStats: Record<string, { count: number; revenue: number }> = {};

    orders.forEach(order => {
      if (order.wizard_data && order.wizard_data.siteType) {
        const service = order.wizard_data.siteType;
        
        if (!serviceStats[service]) {
          serviceStats[service] = { count: 0, revenue: 0 };
        }

        serviceStats[service].count += 1;
        serviceStats[service].revenue += order.price;
      }
    });

    return Object.entries(serviceStats)
      .map(([service, stats]) => ({
        service,
        count: stats.count,
        revenue: stats.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }

  private calculateTopTransactionSources(transactions: any[]): Array<{ source: string; count: number; volume: number }> {
    const sourceStats: Record<string, { count: number; volume: number }> = {};

    transactions.forEach(transaction => {
      const source = transaction.reference_type || 'unknown';
      
      if (!sourceStats[source]) {
        sourceStats[source] = { count: 0, volume: 0 };
      }

      sourceStats[source].count += 1;
      sourceStats[source].volume += Math.abs(transaction.amount);
    });

    return Object.entries(sourceStats)
      .map(([source, stats]) => ({
        source,
        count: stats.count,
        volume: stats.volume,
      }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5);
  }

  private calculateUserRetentionRate(activities: any[]): number {
    if (activities.length === 0) return 0;
    
    // Simplified retention calculation
    const uniqueDays = new Set(activities.map(activity => 
      new Date(activity.created_at).toDateString()
    )).size;
    
    return Math.min(100, (uniqueDays / 30) * 100); // Assuming 30-day period
  }

  private calculateAverageSessionDuration(activities: any[]): number {
    if (activities.length < 2) return 0;
    
    // Simplified session duration calculation
    const sortedActivities = activities.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    
    let totalDuration = 0;
    let sessionCount = 0;
    
    for (let i = 1; i < sortedActivities.length; i++) {
      const timeDiff = new Date(sortedActivities[i].created_at).getTime() - 
                      new Date(sortedActivities[i-1].created_at).getTime();
      
      if (timeDiff < 30 * 60 * 1000) { // 30 minutes threshold
        totalDuration += timeDiff;
        sessionCount++;
      }
    }
    
    return sessionCount > 0 ? totalDuration / sessionCount : 0;
  }

  private calculateTopUserActions(activities: any[]): Array<{ action: string; count: number; uniqueUsers: number }> {
    const actionStats: Record<string, number> = {};

    activities.forEach(activity => {
      const action = activity.activity_type || 'unknown';
      actionStats[action] = (actionStats[action] || 0) + 1;
    });

    return Object.entries(actionStats)
      .map(([action, count]) => ({
        action,
        count,
        uniqueUsers: 1, // Single user analytics
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private calculateUserEngagementScore(activities: any[]): number {
    if (activities.length === 0) return 0;
    
    // Simplified engagement score calculation
    const baseScore = Math.min(100, activities.length * 2);
    const uniqueDays = new Set(activities.map(activity => 
      new Date(activity.created_at).toDateString()
    )).size;
    
    return Math.min(100, (baseScore + uniqueDays * 5) / 2);
  }

  private calculateMonthlyRevenue(orders: any[]): number {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    return orders
      .filter(order => {
        const orderDate = new Date(order.created_at);
        const orderMonth = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
        return orderMonth === currentMonth;
      })
      .reduce((sum, order) => sum + order.price, 0);
  }

  private calculateRevenueGrowth(orders: any[]): number {
    if (orders.length < 2) return 0;
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const currentYear = now.getFullYear();
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    const currentMonthRevenue = orders
      .filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
      })
      .reduce((sum, order) => sum + order.price, 0);
    
    const previousMonthRevenue = orders
      .filter(order => {
        const orderDate = new Date(order.created_at);
        return orderDate.getMonth() === previousMonth && orderDate.getFullYear() === previousYear;
      })
      .reduce((sum, order) => sum + order.price, 0);
    
    if (previousMonthRevenue === 0) return currentMonthRevenue > 0 ? 100 : 0;
    
    return ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100;
  }

  private calculateTopRevenueSources(orders: any[]): Array<{ source: string; revenue: number; percentage: number }> {
    const sourceStats: Record<string, number> = {};
    const totalRevenue = orders.reduce((sum, order) => sum + order.price, 0);
    
    orders.forEach(order => {
      if (order.wizard_data && order.wizard_data.siteType) {
        const source = order.wizard_data.siteType;
        sourceStats[source] = (sourceStats[source] || 0) + order.price;
      }
    });

    return Object.entries(sourceStats)
      .map(([source, revenue]) => ({
        source,
        revenue,
        percentage: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }

  private calculateRevenueByService(orders: any[]): Record<string, number> {
    const serviceRevenue: Record<string, number> = {};

    orders.forEach(order => {
      if (order.wizard_data && order.wizard_data.siteType) {
        const service = order.wizard_data.siteType;
        serviceRevenue[service] = (serviceRevenue[service] || 0) + order.price;
      }
    });

    return serviceRevenue;
  }

  // Empty analytics methods for when no data is available
  private getEmptyOrderAnalytics(): OrderAnalytics {
    return {
      totalOrders: 0,
      totalSpent: 0,
      averageOrderValue: 0,
      orderStatusDistribution: {},
      paymentMethodDistribution: {},
      monthlyTrends: [],
      topServices: [],
    };
  }

  private getEmptyWalletTransactionAnalytics(): WalletTransactionAnalytics {
    return {
      totalTransactions: 0,
      totalVolume: 0,
      averageTransactionValue: 0,
      transactionTypeDistribution: {},
      monthlyTrends: [],
      topTransactionSources: [],
    };
  }

  private getEmptyRevenueAnalytics(): RevenueAnalytics {
    return {
      totalRevenue: 0,
      monthlyRevenue: 0,
      revenueGrowth: 0,
      topRevenueSources: [],
      revenueByService: {},
      averageOrderValue: 0,
      customerLifetimeValue: 0,
    };
  }
}
