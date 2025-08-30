import {
    Controller,
    Post,
    Get,
    Patch,
    Param,
    Body,
    Query,
    UseGuards,
    ParseIntPipe,
    DefaultValuePipe,
    BadRequestException,
  } from '@nestjs/common';
  import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiQuery,
    ApiBearerAuth,
    ApiBody,
  } from '@nestjs/swagger';
  import { EnhancedOrdersService } from './enhanced-orders.service';
  import { JwtGuard } from '../common/guards/jwt.guard';
  import { RolesGuard, Roles } from '../common/guards/roles.guard';
  import { User, UserPayload } from '../common/decorators/user.decorator';
  import {
    CreateEnhancedOrderDto,
    UpdateEnhancedOrderDto,
    EnhancedOrderResponseDto,
    EnhancedOrderDetails,
  } from './dto/enhanced-order.dto';
  
  @ApiTags('Enhanced Orders')
  @ApiBearerAuth()
  @Controller('orders')
  @UseGuards(JwtGuard)
  export class EnhancedOrdersController {
    constructor(private readonly enhancedOrdersService: EnhancedOrdersService) {}
  
    @Post()
    @ApiOperation({
      summary: 'Create Enhanced Order',
      description: 'Creates a new order with comprehensive wizard data and payment options',
    })
    @ApiBody({ type: CreateEnhancedOrderDto })
    @ApiResponse({
      status: 201,
      description: 'Order created successfully',
      type: EnhancedOrderResponseDto,
    })
    @ApiResponse({ status: 400, description: 'Bad request - invalid order data' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async createEnhancedOrder(
      @User() user: UserPayload,
      @Body() createOrderDto: CreateEnhancedOrderDto,
    ): Promise<EnhancedOrderResponseDto> {
      return this.enhancedOrdersService.createEnhancedOrder(user.id, createOrderDto);
    }
  
    @Get(':orderId/enhanced')
    @ApiOperation({
      summary: 'Get Enhanced Order Details',
      description: 'Retrieves comprehensive order details including progress and wallet information',
    })
    @ApiParam({ name: 'orderId', description: 'Order ID' })
    @ApiResponse({
      status: 200,
      description: 'Order details retrieved successfully',
      schema: {
        example: {
          id: 'order_123',
          title: 'Website Design',
          description: 'Professional website design',
          price: 5000000,
          status: 'pending',
          payment_status: 'pending',
          user_id: 'user_123',
          wizard_data: {},
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          progress: {
            orderId: 'order_123',
            currentStep: 'pending',
            completedSteps: [],
            remainingSteps: ['confirmed', 'in_progress', 'completed'],
            progressPercentage: 0,
            estimatedDelivery: '2024-02-01T00:00:00.000Z',
            lastUpdate: '2024-01-01T00:00:00.000Z',
            nextMilestone: 'Order Confirmation',
            timeline: []
          },
          walletBalance: 10000000,
          canPayWithWallet: true
        }
      }
    })
    @ApiResponse({ status: 404, description: 'Order not found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getEnhancedOrder(
      @Param('orderId') orderId: string,
      @User() user: UserPayload,
    ): Promise<EnhancedOrderDetails> {
      return this.enhancedOrdersService.getEnhancedOrder(orderId, user.id);
    }
  
    @Patch(':orderId')
    @ApiOperation({
      summary: 'Update Enhanced Order',
      description: 'Updates order details, payment status, and related information',
    })
    @ApiParam({ name: 'orderId', description: 'Order ID' })
    @ApiBody({ type: UpdateEnhancedOrderDto })
    @ApiResponse({
      status: 200,
      description: 'Order updated successfully',
      type: EnhancedOrderResponseDto,
    })
    @ApiResponse({ status: 404, description: 'Order not found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async updateEnhancedOrder(
      @Param('orderId') orderId: string,
      @User() user: UserPayload,
      @Body() updateOrderDto: UpdateEnhancedOrderDto,
    ): Promise<EnhancedOrderResponseDto> {
      return this.enhancedOrdersService.updateEnhancedOrder(orderId, user.id, updateOrderDto);
    }
  
    @Get('users/me/orders')
    @ApiOperation({
      summary: 'Get User Orders with Pagination',
      description: 'Retrieves user\'s order history with filtering and pagination',
    })
    @ApiQuery({ name: 'status', required: false, description: 'Order status filter' })
    @ApiQuery({ name: 'payment_status', required: false, description: 'Payment status filter' })
    @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
    @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 20)' })
    @ApiQuery({ name: 'from_date', required: false, description: 'Start date filter' })
    @ApiQuery({ name: 'to_date', required: false, description: 'End date filter' })
    @ApiResponse({
      status: 200,
      description: 'Orders retrieved successfully',
      schema: {
        example: {
          orders: [
            {
              id: 'order_123',
              title: 'Website Design - Business',
              price: 5000000,
              status: 'pending',
              payment_status: 'pending',
              created_at: '2024-01-01T00:00:00.000Z',
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
    async getUserOrders(
      @User() user: UserPayload,
      @Query('status') status?: string,
      @Query('payment_status') payment_status?: string,
      @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
      @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
      @Query('from_date') from_date?: string,
      @Query('to_date') to_date?: string,
    ) {
      return this.enhancedOrdersService.getUserOrders(user.id, {
        status,
        payment_status,
        page,
        limit,
        from_date,
        to_date,
      });
    }
  
    @Post(':orderId/wallet-payment')
    @ApiOperation({
      summary: 'Process Wallet Payment for Order',
      description: 'Processes payment for an order using wallet balance',
    })
    @ApiParam({ name: 'orderId', description: 'Order ID' })
    @ApiBody({
      schema: {
        example: {
          amount: 5000000,
          description: 'Payment for website design order',
          referenceData: {
            order_title: 'Website Design - Business',
            site_type: 'business',
            domain: 'example.com',
          },
        },
      },
    })
    @ApiResponse({
      status: 200,
      description: 'Wallet payment processed successfully',
      schema: {
        example: {
          success: true,
          transactionId: 'txn_123',
          newBalance: 1000000,
          paymentDetails: {
            amount: 5000000,
            description: 'Payment for order order_123',
            timestamp: '2024-01-01T00:00:00.000Z',
            referenceId: 'order_123',
          },
        },
      },
    })
    @ApiResponse({ status: 400, description: 'Insufficient wallet balance or invalid order' })
    @ApiResponse({ status: 404, description: 'Order not found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async processWalletPayment(
      @Param('orderId') orderId: string,
      @User() user: UserPayload,
      @Body() body: { amount: number; description?: string },
    ) {
      if (!body.amount || body.amount <= 0) {
        throw new BadRequestException('Valid amount is required');
      }
  
      return this.enhancedOrdersService.processWalletPayment(orderId, user.id, body.amount);
    }
  
    @Get(':orderId/progress')
    @ApiOperation({
      summary: 'Get Order Progress',
      description: 'Retrieves comprehensive order progress information and timeline',
    })
    @ApiParam({ name: 'orderId', description: 'Order ID' })
    @ApiResponse({
      status: 200,
      description: 'Order progress retrieved successfully',
      schema: {
        example: {
          orderId: 'order_123',
          currentStep: 'payment_confirmation',
          completedSteps: ['order_created'],
          remainingSteps: ['design_start', 'design_review', 'development', 'testing', 'deployment'],
          progressPercentage: 20,
          estimatedDelivery: '2024-01-08T00:00:00.000Z',
          lastUpdate: '2024-01-01T00:00:00.000Z',
          nextMilestone: 'design_start',
          timeline: [
            {
              step: 'order_created',
              status: 'completed',
              completedAt: '2024-01-01T00:00:00.000Z',
              estimatedDuration: '1 day',
              description: 'Order has been created and is awaiting payment confirmation',
            },
          ],
        },
      },
    })
    @ApiResponse({ status: 404, description: 'Order not found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getOrderProgress(@Param('orderId') orderId: string, @User() user: UserPayload) {
      return this.enhancedOrdersService.getOrderProgress(orderId);
    }
  
    @Patch(':orderId/progress')
    @ApiOperation({
      summary: 'Update Order Progress',
      description: 'Updates order progress step with notes and attachments',
    })
    @ApiParam({ name: 'orderId', description: 'Order ID' })
    @ApiBody({
      schema: {
        example: {
          step: 'design_start',
          status: 'in_progress',
          notes: 'Design work has begun',
          attachments: [
            {
              filename: 'design-concept.pdf',
              url: 'https://example.com/files/design-concept.pdf',
              type: 'pdf',
            },
          ],
        },
      },
    })
    @ApiResponse({
      status: 200,
      description: 'Order progress updated successfully',
      schema: {
        example: {
          success: true,
          updatedStep: 'design_start',
          progressPercentage: 30,
          nextStep: 'design_review',
        },
      },
    })
    @ApiResponse({ status: 404, description: 'Order not found' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async updateOrderProgress(
      @Param('orderId') orderId: string,
      @User() user: UserPayload,
      @Body() body: {
        step: string;
        status: 'completed' | 'in_progress' | 'pending';
        notes?: string;
        attachments?: Array<{ filename: string; url: string; type: string }>;
      },
    ) {
      // This endpoint would typically be used by admin users or the system
      // For now, we'll just return the current progress
      return this.enhancedOrdersService.getOrderProgress(orderId);
    }
  
    @Get('admin/all')
    @UseGuards(RolesGuard)
    @Roles('admin')
    @ApiOperation({
      summary: 'Get All Orders (Admin Only)',
      description: 'Retrieves all orders in the system with pagination. Requires admin role.',
    })
    @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
    @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 50)' })
    @ApiQuery({ name: 'status', required: false, description: 'Order status filter' })
    @ApiQuery({ name: 'payment_status', required: false, description: 'Payment status filter' })
    @ApiResponse({
      status: 200,
      description: 'All orders retrieved successfully',
      type: [EnhancedOrderResponseDto],
    })
    @ApiResponse({ status: 403, description: 'Access denied - admin role required' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getAllOrders(
      @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
      @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
      @Query('status') status?: string,
      @Query('payment_status') payment_status?: string,
    ) {
      // This would be implemented to get all orders for admin users
      // For now, return empty result
      return {
        orders: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0,
        },
      };
    }
  }