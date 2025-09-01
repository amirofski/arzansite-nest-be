import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  BadRequestException,
} from '@nestjs/common';
import { JwtGuard } from '../common/guards/jwt.guard';
import { User, UserPayload } from '../common/decorators/user.decorator';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(JwtGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('orders')
  @UseGuards(JwtGuard)
  async getUserOrderAnalytics(
    @User() user: any,
    @Query('period') period: string = '30d',
    @Query('groupBy') groupBy: string = 'day'
  ) {
    return this.analyticsService.getUserOrderAnalytics(
      user.id,
      period,
      groupBy
    );
  }

  @Get('wallet-transactions')
  @UseGuards(JwtGuard)
  async getWalletTransactionAnalytics(
    @User() user: any,
    @Query('period') period: string = '30d',
    @Query('type') type?: string
  ) {
    return this.analyticsService.getWalletTransactionAnalytics(
      user.id,
      period,
      type
    );
  }

  @Get('user-behavior')
  @UseGuards(JwtGuard)
  async getUserBehaviorAnalytics(
    @User() user: any,
    @Query('period') period: string = '30d'
  ) {
    return this.analyticsService.getUserBehaviorAnalytics(
      user.id,
      period
    );
  }

  @Get('revenue')
  @UseGuards(JwtGuard)
  async getRevenueAnalytics(
    @User() user: any,
    @Query('period') period: string = '30d'
  ) {
    return this.analyticsService.getRevenueAnalytics(
      user.id,
      period
    );
  }

  @Get('dashboard')
  @UseGuards(JwtGuard)
  async getDashboardAnalytics(@User() user: any) {
    return this.analyticsService.getDashboardAnalytics(
      user.id
    );
  }

  @Get('export')
  async exportAnalytics(
    @User() user: UserPayload,
    @Query('type') type: 'orders' | 'wallet' | 'behavior' | 'revenue' | 'all',
    @Query('period') period: '7d' | '30d' | '90d' | '1y' | 'all' = '30d',
    @Query('format') format: 'csv' | 'json' | 'pdf' = 'json'
  ) {
    // This endpoint would handle exporting analytics data in various formats
    // For now, we'll return a placeholder response
    return {
      message: 'Export functionality will be implemented',
      type,
      period,
      format,
      user_id: user.id,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('reports')
  async getReportTemplates(@User() user: UserPayload) {
    // This endpoint would return available report templates
    return {
      availableReports: [
        {
          id: 'monthly_summary',
          name: 'Monthly Summary Report',
          description: 'Comprehensive monthly overview of orders, revenue, and wallet activity',
          parameters: ['period', 'include_charts', 'export_format'],
        },
        {
          id: 'order_analysis',
          name: 'Order Analysis Report',
          description: 'Detailed analysis of order patterns and trends',
          parameters: ['period', 'group_by', 'include_breakdown'],
        },
        {
          id: 'wallet_summary',
          name: 'Wallet Summary Report',
          description: 'Wallet transaction summary and balance trends',
          parameters: ['period', 'transaction_types', 'include_charts'],
        },
        {
          id: 'user_engagement',
          name: 'User Engagement Report',
          description: 'User behavior and engagement metrics',
          parameters: ['period', 'metrics', 'include_recommendations'],
        },
      ],
      user_id: user.id,
    };
  }

  @Get('insights')
  async getInsights(
    @User() user: UserPayload,
    @Query('category') category: 'orders' | 'wallet' | 'behavior' | 'revenue' | 'all' = 'all'
  ) {
    // This endpoint would provide AI-powered insights and recommendations
    // For now, we'll return placeholder insights
    const insights = {
      orders: [
        {
          type: 'trend',
          title: 'Order Volume Trend',
          description: 'Your order volume has increased by 15% this month compared to last month',
          impact: 'positive',
          recommendation: 'Consider expanding your service offerings to capitalize on this growth',
        },
        {
          type: 'pattern',
          title: 'Peak Order Times',
          description: 'Most orders are placed between 2 PM and 6 PM',
          impact: 'informational',
          recommendation: 'Schedule important communications during these peak hours',
        },
      ],
      wallet: [
        {
          type: 'balance',
          title: 'Wallet Balance Health',
          description: 'Your wallet balance is sufficient for 3-4 average orders',
          impact: 'positive',
          recommendation: 'Consider setting up auto-topup for convenience',
        },
      ],
      behavior: [
        {
          type: 'engagement',
          title: 'User Engagement',
          description: 'Your engagement score is 85/100, which is above average',
          impact: 'positive',
          recommendation: 'Continue with your current engagement strategies',
        },
      ],
      revenue: [
        {
          type: 'growth',
          title: 'Revenue Growth',
          description: 'Revenue has grown by 22% this quarter',
          impact: 'positive',
          recommendation: 'This growth rate suggests strong market demand for your services',
        },
      ],
    };

    if (category === 'all') {
      return {
        insights: Object.values(insights).flat(),
        summary: {
          totalInsights: Object.values(insights).flat().length,
          positiveInsights: Object.values(insights).flat().filter(i => i.impact === 'positive').length,
          recommendations: Object.values(insights).flat().filter(i => i.recommendation).length,
        },
        user_id: user.id,
        generatedAt: new Date().toISOString(),
      };
    }

    return {
      insights: insights[category] || [],
      category,
      user_id: user.id,
      generatedAt: new Date().toISOString(),
    };
  }

  @Get('comparison')
  async getComparisonAnalytics(
    @User() user: UserPayload,
    @Query('metric') metric: 'orders' | 'revenue' | 'wallet_volume' | 'user_engagement',
    @Query('period1') period1: '7d' | '30d' | '90d' | '1y' = '30d',
    @Query('period2') period2: '7d' | '30d' | '90d' | '1y' = '90d'
  ) {
    // This endpoint would provide comparison analytics between two periods
    // For now, we'll return a placeholder response
    return {
      message: 'Comparison analytics will be implemented',
      metric,
      period1,
      period2,
      user_id: user.id,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('forecasting')
  async getForecastingAnalytics(
    @User() user: UserPayload,
    @Query('metric') metric: 'orders' | 'revenue' | 'wallet_activity',
    @Query('horizon') horizon: '7d' | '30d' | '90d' = '30d'
  ) {
    // This endpoint would provide forecasting/predictive analytics
    // For now, we'll return a placeholder response
    return {
      message: 'Forecasting analytics will be implemented',
      metric,
      horizon,
      user_id: user.id,
      timestamp: new Date().toISOString(),
    };
  }
}
