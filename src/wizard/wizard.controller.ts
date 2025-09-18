import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFiles,
  UseGuards,
  Request,
  ParseIntPipe,
  ParseEnumPipe,
  UsePipes,
  ValidationPipe,
  GoneException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiConsumes,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiSecurity,
} from '@nestjs/swagger';
import { WizardService } from './wizard.service';
import {
  SaveProgressDto,
  CompleteOrderDto,
  UpdateOrderDto,
  CalculatePriceDto,
  WizardOrderDto,
  OrderStatus,
  DomainAvailabilityDto,
  DomainPriceDto,
  SaveDesignDto,
  OrderResponseDto,
} from './dto/wizard.dto';
import { JwtGuard } from '../common/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/guards/roles.guard';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';
import { ErrorInterceptor } from '../common/interceptors/error.interceptor';
import { User } from '../common/decorators/user.decorator';
import { UserPayload } from '../common/decorators/user.decorator';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

// Custom validation pipe that doesn't strip unknown properties
class WizardValidationPipe extends ValidationPipe {
  constructor() {
    super({
      whitelist: false, // Don't strip unknown properties
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      forbidUnknownValues: false,
    });
  }
}

@ApiTags('Wizard')
@Controller('wizard')
export class WizardController {
  constructor(private readonly wizardService: WizardService) {}

  @Post('save-progress')
  @ApiOperation({ summary: 'Save Wizard Progress (DEPRECATED)' })
  @ApiBody({
    schema: {
      example: {
        session_id: 'wizard_1757606041806',
        user_id: 'user_123',
        current_step: '1',
        is_completed: false,
        wizard_data: {
          siteType: 'personal',
          branding: { primaryColor: '#8B5CF6', fontFamily: 'vazir' },
          current_step: 1
        }
      }
    }
  })
  @ApiResponse({ status: 410, description: 'Deprecated endpoint. Use POST /wizard/save-session instead.' })
  async saveProgress(@Body() saveProgressDto: SaveProgressDto): Promise<never> {
    // Log deprecated usage for short window
    console.warn('[DEPRECATION] POST /wizard/save-progress called', { session_id: saveProgressDto?.session_id, at: new Date().toISOString() });
    throw new GoneException('This endpoint is deprecated. Use POST /wizard/save-session instead.');
  }

  // New alias for frontend: POST /wizard/save-session { session_id, wizard_data }
  @Post('save-session')
  @ApiOperation({ summary: 'Save Wizard Session (alias)', description: 'Upserts wizard_data for a session_id' })
  @ApiBody({
    schema: {
      example: {
        session_id: 'wizard_1757606041806',
        user_id: 'user_123',
        wizard_data: { pageStructure: 'single', modules: [], current_step: 2 }
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Session saved successfully' })
  async saveSession(@Body() body: { session_id: string; wizard_data: Record<string, unknown>; user_id?: string }) {
    return this.wizardService.saveSession(body.session_id, body.wizard_data, body.user_id);
  }

  @Get('progress/:session_id')
  @ApiOperation({ summary: 'Get Wizard Progress by Session ID' })
  @ApiParam({ name: 'session_id', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Progress retrieved successfully', type: WizardOrderDto })
  @ApiResponse({ status: 404, description: 'Progress not found' })
  async getProgress(
    @Param('session_id') session_id: string,
    @Query('user_id') user_id?: string,
  ): Promise<WizardOrderDto> {
    return this.wizardService.getProgress(session_id, user_id);
  }

  // New alias for frontend: GET /wizard/load-progress/:session_id
  @Get('load-progress/:session_id')
  @ApiOperation({ summary: 'Load Wizard Progress (alias)', description: 'Returns wizard_data object for quick hydrate' })
  @ApiParam({ name: 'session_id', description: 'Wizard session ID' })
  @ApiResponse({ status: 200, description: 'Wizard data retrieved', schema: { example: { siteType: 'personal', current_step: 3 } } })
  async loadProgress(@Param('session_id') session_id: string) {
    return this.wizardService.loadProgress(session_id);
  }

  // New alias for frontend: GET /wizard/progress?session_id=...
  @Get('progress')
  @ApiOperation({ summary: 'Load Wizard Progress by query', description: 'Returns { success, data } by session_id query parameter' })
  async loadProgressByQuery(@Query('session_id') session_id: string) {
    return this.wizardService.loadProgress(session_id);
  }

  @Get('progress/user/:user_id')
  @ApiOperation({ summary: 'Get User Wizard Progress' })
  @ApiParam({ name: 'user_id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User progress retrieved successfully', type: [WizardOrderDto] })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  async getUserProgress(@Param('user_id') user_id: string): Promise<WizardOrderDto[]> {
    return this.wizardService.getUserProgress(user_id);
  }

  @Post('complete-order')
  @UsePipes(new WizardValidationPipe()) // Use custom validation pipe that doesn't strip user_id
  @ApiOperation({ summary: 'Complete Wizard Order' })
  @ApiResponse({ status: 201, description: 'Order completed successfully', type: OrderResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  async completeOrder(
    @Body() completeOrderDto: CompleteOrderDto,
    @Request() req: any,
  ): Promise<OrderResponseDto> {
    const user_id = req.user?.user_id || req.user?.user_id || req.user?.id;
    return this.wizardService.completeOrder(completeOrderDto, user_id);
  }

  @Put('orders/:order_id')
  @ApiOperation({ summary: 'Update Wizard Order' })
  @ApiParam({ name: 'order_id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order updated successfully', type: WizardOrderDto })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  async updateOrder(
    @Param('order_id') order_id: string,
    @Body() updateOrderDto: UpdateOrderDto,
    @Request() req: any,
  ): Promise<WizardOrderDto> {
    const user_id = req.user?.user_id || req.user?.id;
    return this.wizardService.updateOrder(order_id, updateOrderDto, user_id, false);
  }

  @Get('orders/:order_id')
  @ApiOperation({ summary: 'Get Wizard Order' })
  @ApiParam({ name: 'order_id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order retrieved successfully', type: WizardOrderDto })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  async getOrder(
    @Param('order_id') order_id: string,
    @Request() req: any,
  ): Promise<WizardOrderDto> {
    const user_id = req.user?.user_id || req.user?.id;
    return this.wizardService.getOrder(order_id, user_id, false);
  }

  @Get('orders/user/:user_id')
  @ApiOperation({ summary: 'List User Orders' })
  @ApiParam({ name: 'user_id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User orders retrieved successfully', type: [WizardOrderDto] })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  async listUserOrders(@Param('user_id') user_id: string): Promise<WizardOrderDto[]> {
    return this.wizardService.listUserOrders(user_id);
  }

  @Get('orders/admin')
  @ApiOperation({ summary: 'List All Orders (Admin Only)' })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiSecurity('admin')
  async listAllOrders(
    @Query('status') status?: OrderStatus,
    @Query('page', ParseIntPipe) page: number = 1,
    @Query('limit', ParseIntPipe) limit: number = 20,
    @Query('search') search?: string,
  ) {
    return this.wizardService.listAllOrders(status, page, limit, search);
  }

  @Post('upload-files')
  @ApiOperation({ summary: 'Upload Project Files (deprecated - proxies to storage)', description: 'Use POST /storage/upload/:bucketId instead. This endpoint will be removed after the transition.', deprecated: true })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        order_id: { type: 'string' },
        session_id: { type: 'string' },
        description: { type: 'string' },
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Files uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadFiles(
    @Body() fileUploadDto: { order_id: string; session_id: string; description?: string },
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req: any,
  ) {
    // PROXY to central storage endpoint: /storage/upload/:bucketId
    const bucketId = process.env.APPWRITE_STORAGE_PROJECT_FILES || this.wizardService['appwriteService']?.getConfig()?.storage?.projectFiles;
    if (!bucketId) {
      return { success: false, message: 'Storage bucket not configured' };
    }

    // Forward each file individually as storage upload does single-file handling
    const results: any[] = [];
    const errors: string[] = [];
    for (const file of files || []) {
      try {
        // Reuse the service upload logic (it writes project_files too)
        const { uploadedFiles, errors: errs } = await this.wizardService.uploadFiles(
          fileUploadDto.order_id,
          fileUploadDto.session_id,
          [file],
          req.user?.user_id || req.user?.id,
          fileUploadDto.description,
        );
        if (uploadedFiles?.length) results.push(uploadedFiles[0]);
        if (errs?.length) errors.push(...errs);
      } catch (e: any) {
        errors.push(e?.message || 'Upload failed');
      }
    }
    return { success: errors.length === 0, uploaded: results, errors };
  }

  @Get('files/:file_id')
  @ApiOperation({ summary: 'Get File Info' })
  @ApiParam({ name: 'file_id', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'File info retrieved successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getFileInfo(@Param('file_id') file_id: string) {
    // This would need to be implemented based on your storage service
    return { file_id, message: 'File info retrieval not implemented' };
  }

  @Delete('files/:file_id')
  @ApiOperation({ summary: 'Delete File' })
  @ApiParam({ name: 'file_id', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'File not found' })
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  async deleteFile(
    @Param('file_id') file_id: string,
    @Query('order_id') order_id: string,
    @Request() req: any,
  ) {
    const user_id = req.user?.user_id || req.user?.id;
    return this.wizardService.deleteFile(order_id, file_id, user_id, false);
  }

  @Get('orders/:order_id/files')
  @ApiOperation({ summary: 'List Order Files' })
  @ApiParam({ name: 'order_id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order files retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  async listOrderFiles(
    @Param('order_id') order_id: string,
    @Request() req: any,
  ) {
    const user_id = req.user?.user_id || req.user?.id;
    return this.wizardService.listOrderFiles(order_id, user_id, false);
  }

  @Get('domains/extensions')
  @ApiOperation({ summary: 'Get Available Domain Extensions' })
  @ApiResponse({ status: 200, description: 'Domain extensions retrieved successfully' })
  async getAvailableDomainExtensions() {
    return this.wizardService.getAvailableDomainExtensions();
  }

  @Post('domains/check-availability')
  @ApiOperation({ summary: 'Check Domain Availability' })
  @ApiResponse({ status: 200, description: 'Domain availability checked successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async checkDomainAvailability(@Body() domainAvailabilityDto: DomainAvailabilityDto) {
    return this.wizardService.checkDomainAvailability(
      domainAvailabilityDto.domain,
      domainAvailabilityDto.extension,
    );
  }

  @Get('domains/prices')
  @ApiOperation({ summary: 'Get Domain Prices' })
  @ApiResponse({ status: 200, description: 'Domain prices retrieved successfully' })
  async getDomainPrices() {
    return this.wizardService.getDomainPrices();
  }

  @Put('domains/prices/:extensionId')
  @ApiOperation({ summary: 'Update Domain Prices (Admin Only)' })
  @ApiParam({ name: 'extensionId', description: 'Domain Extension ID' })
  @ApiResponse({ status: 200, description: 'Domain prices updated successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiSecurity('admin')
  async updateDomainPrices(
    @Param('extensionId') extensionId: string,
    @Body() domainPriceDto: DomainPriceDto,
  ) {
    return this.wizardService.updateDomainPrices(
      extensionId,
      domainPriceDto.price,
      domainPriceDto.available,
    );
  }

  @Post('calculate-price')
  @ApiOperation({ summary: 'Calculate Order Price' })
  @ApiBody({
    description: 'Order pricing inputs',
    schema: {
      type: 'object',
      properties: {
        site_type: { type: 'string', example: 'BUSINESS' },
        website_framework: { type: 'object', example: { dynamicDesign: { pages: [{ sections: ["hero","features"]}] } } },
        additional_services: { type: 'object', example: { seoOptimization: true, analyticsSetup: true } },
        paymentCycle: { type: 'string', example: 'ANNUAL' },
      }
    }
  })
  @ApiResponse({ status: 200, description: 'Price calculated successfully', schema: { example: { basePrice: 800000, pagesCost: 200000, sectionsCost: 100000, additionalServicesCost: 300000, domainCost: 50000, totalPrice: 1450000, monthlyPrice: 1450000, annualPrice: 17400000, annualDiscount: 255000 } } })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async calculatePrice(@Body() calculatePriceDto: CalculatePriceDto) {
    return this.wizardService.calculatePricing(calculatePriceDto);
  }

  @Get('pricing-config')
  @ApiOperation({ summary: 'Get Pricing Configuration' })
  @ApiResponse({ status: 200, description: 'Pricing configuration retrieved successfully' })
  async getPricingConfiguration() {
    return this.wizardService.getPricingConfiguration();
  }

  @Post('designs')
  @ApiOperation({ summary: 'Save Dynamic Design Structure' })
  @ApiResponse({ status: 201, description: 'Design saved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  async saveDesign(@Body() saveDesignDto: SaveDesignDto, @Request() req: any) {
    const user_id = req.user?.user_id || req.user?.id;
    return this.wizardService.saveDesign(saveDesignDto, user_id);
  }

  @Get('designs/:order_id')
  @ApiOperation({ summary: 'Get Design by Order' })
  @ApiParam({ name: 'order_id', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Design retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Design not found' })
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  async getDesign(@Param('order_id') order_id: string, @Request() req: any) {
    const user_id = req.user?.user_id || req.user?.id;
    return this.wizardService.getDesign(order_id, user_id);
  }
}
