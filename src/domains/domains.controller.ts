import { Controller, Get, Query, UseGuards, Post, Body, Put, Param, UseInterceptors } from '@nestjs/common';
import { DomainsService } from './domains.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { JwtGuard } from '../common/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/guards/roles.guard';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';

@ApiTags('domains')
@Controller('domains')
@UseInterceptors(TransformInterceptor)
export class DomainsController {
  constructor(private readonly domainsService: DomainsService) {}

  @Get('extensions')
  @ApiOperation({ summary: 'Get Available Domain Extensions' })
  @ApiResponse({ status: 200, description: 'Domain extensions retrieved successfully' })
  async getAvailableDomainExtensions() {
    return this.domainsService.getAvailableDomainExtensions();
  }

  @Post('check-availability')
  @ApiOperation({ summary: 'Check Domain Availability' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        domain: { type: 'string' },
        extension: { type: 'string' }
      },
      required: ['domain']
    }
  })
  @ApiResponse({ status: 200, description: 'Domain availability checked successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async checkDomainAvailability(
    @Body('domain') domain: string, 
    @Body('extension') extension: string = '.ir'
  ) {
    return this.domainsService.checkDomainAvailability(domain, extension);
  }

  @Get('prices')
  @ApiOperation({ summary: 'Get Domain Prices' })
  @ApiResponse({ status: 200, description: 'Domain prices retrieved successfully', schema: { example: [{ "$id": "ext_ir", "extension": ".ir", "price": 50000, "available": true }] } })
  async getDomainPrices() {
    return this.domainsService.getDomainPrices();
  }

  @Post('extensions')
  @ApiOperation({ summary: 'Create Domain Extension (Admin Only)' })
  @ApiBody({
    schema: {
      example: {
        extension: '.io',
        price: 1200000,
        description: 'Tech domain',
        available: true,
        isDefault: false
      }
    }
  })
  @ApiResponse({ status: 201, description: 'Domain extension created' })
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiSecurity('admin')
  async createDomainExtension(@Body() body: { extension: string; price: number; description?: string; available: boolean; isDefault?: boolean }) {
    return this.domainsService.createDomainExtension(body);
  }

  @Put('prices/:extensionId')
  @ApiOperation({ summary: 'Update Domain Prices (Admin Only)' })
  @ApiParam({ name: 'extensionId', description: 'Domain Extension ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        price: { type: 'number' },
        available: { type: 'boolean' }
      },
      required: ['price', 'available']
    }
  })
  @ApiResponse({ status: 200, description: 'Domain prices updated successfully' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiSecurity('admin')
  async updateDomainPrices(
    @Param('extensionId') extensionId: string,
    @Body() updateData: { price: number; available: boolean }
  ) {
    return this.domainsService.updateDomainPrices(
      extensionId,
      updateData.price,
      updateData.available
    );
  }

  @Get('check')
  async checkDomainAvailabilityGet(
    @Query('domain') domain: string,
    @Query('extension') extension: string = '.ir',
  ) {
    return this.domainsService.checkDomainAvailability(domain, extension);
  }

  @Get('search')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  async searchDomains(@Query('q') query: string) {
    return this.domainsService.searchDomains(query);
  }

  @Post('check')
  async checkDomainPost(@Body('domain') domain: string, @Body('extension') extension: string = '.ir') {
    return this.domainsService.checkDomainAvailability(domain, extension);
  }
}
