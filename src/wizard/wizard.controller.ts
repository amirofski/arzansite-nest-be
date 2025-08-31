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
@UseInterceptors(TransformInterceptor)
export class WizardController {
  constructor(private readonly wizardService: WizardService) {}

  @Post('save-progress')
  @ApiOperation({ summary: 'Save Wizard Progress' })
  @ApiResponse({ status: 201, description: 'Progress saved successfully', type: WizardOrderDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async saveProgress(@Body() saveProgressDto: SaveProgressDto): Promise<WizardOrderDto> {
    return this.wizardService.saveProgress(saveProgressDto);
  }

  @Get('progress/:sessionId')
  @ApiOperation({ summary: 'Get Wizard Progress by Session ID' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiResponse({ status: 200, description: 'Progress retrieved successfully', type: WizardOrderDto })
  @ApiResponse({ status: 404, description: 'Progress not found' })
  async getProgress(
    @Param('sessionId') sessionId: string,
    @Query('userId') userId?: string,
  ): Promise<WizardOrderDto> {
    return this.wizardService.getProgress(sessionId, userId);
  }

  @Get('progress/user/:userId')
  @ApiOperation({ summary: 'Get User Wizard Progress' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User progress retrieved successfully', type: [WizardOrderDto] })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  async getUserProgress(@Param('userId') userId: string): Promise<WizardOrderDto[]> {
    return this.wizardService.getUserProgress(userId);
  }

  @Post('complete-order')
  @UsePipes(new WizardValidationPipe()) // Use custom validation pipe that doesn't strip user_id
  @ApiOperation({ summary: 'Complete Wizard Order' })
  @ApiResponse({ status: 201, description: 'Order completed successfully', type: WizardOrderDto })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  async completeOrder(@Body() completeOrderDto: CompleteOrderDto): Promise<WizardOrderDto> {
    return this.wizardService.completeOrder(completeOrderDto);
  }

  @Put('orders/:orderId')
  @ApiOperation({ summary: 'Update Wizard Order' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order updated successfully', type: WizardOrderDto })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  async updateOrder(
    @Param('orderId') orderId: string,
    @Body() updateOrderDto: UpdateOrderDto,
    @Request() req: any,
  ): Promise<WizardOrderDto> {
    const userId = req.user?.userId || req.user?.id;
    return this.wizardService.updateOrder(orderId, updateOrderDto, userId, false);
  }

  @Get('orders/:orderId')
  @ApiOperation({ summary: 'Get Wizard Order' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order retrieved successfully', type: WizardOrderDto })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  async getOrder(
    @Param('orderId') orderId: string,
    @Request() req: any,
  ): Promise<WizardOrderDto> {
    const userId = req.user?.userId || req.user?.id;
    return this.wizardService.getOrder(orderId, userId, false);
  }

  @Get('orders/user/:userId')
  @ApiOperation({ summary: 'List User Orders' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User orders retrieved successfully', type: [WizardOrderDto] })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  async listUserOrders(@Param('userId') userId: string): Promise<WizardOrderDto[]> {
    return this.wizardService.listUserOrders(userId);
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
  @ApiOperation({ summary: 'Upload Project Files' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        orderId: { type: 'string' },
        sessionId: { type: 'string' },
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
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadFiles(
    @Body() fileUploadDto: { orderId: string; sessionId: string },
            @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.wizardService.uploadFiles(fileUploadDto.orderId, fileUploadDto.sessionId, files);
  }

  @Get('files/:fileId')
  @ApiOperation({ summary: 'Get File Info' })
  @ApiParam({ name: 'fileId', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'File info retrieved successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getFileInfo(@Param('fileId') fileId: string) {
    // This would need to be implemented based on your storage service
    return { fileId, message: 'File info retrieval not implemented' };
  }

  @Delete('files/:fileId')
  @ApiOperation({ summary: 'Delete File' })
  @ApiParam({ name: 'fileId', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'File not found' })
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  async deleteFile(
    @Param('fileId') fileId: string,
    @Query('orderId') orderId: string,
    @Request() req: any,
  ) {
    const userId = req.user?.userId || req.user?.id;
    return this.wizardService.deleteFile(orderId, fileId, userId, false);
  }

  @Get('orders/:orderId/files')
  @ApiOperation({ summary: 'List Order Files' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Order files retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  async listOrderFiles(
    @Param('orderId') orderId: string,
    @Request() req: any,
  ) {
    const userId = req.user?.userId || req.user?.id;
    return this.wizardService.listOrderFiles(orderId, userId, false);
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
  @ApiResponse({ status: 200, description: 'Price calculated successfully' })
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
    const userId = req.user?.userId || req.user?.id;
    return this.wizardService.saveDesign(saveDesignDto, userId);
  }

  @Get('designs/:orderId')
  @ApiOperation({ summary: 'Get Design by Order' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Design retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Design not found' })
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  async getDesign(@Param('orderId') orderId: string, @Request() req: any) {
    const userId = req.user?.userId || req.user?.id;
    return this.wizardService.getDesign(orderId, userId);
  }
}
