import {
  Controller,
  Get,
  Patch,
  UseGuards,
  Body,
} from '@nestjs/common';
import { SiteConfigService } from './site-config.service';
import { UpdateSiteConfigDto } from './dto/site-config.dto';
import { JwtGuard } from '../common/guards/jwt.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';

@Controller('site-config')
export class SiteConfigController {
  constructor(private readonly siteConfigService: SiteConfigService) {}

  @Get('current')
  async getCurrentConfig() {
    return this.siteConfigService.getCurrentConfig();
  }

  @Patch()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('admin')
  async updateConfig(@Body() updateSiteConfigDto: UpdateSiteConfigDto) {
    return this.siteConfigService.updateConfig(updateSiteConfigDto);
  }

  @Get('history')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('admin')
  async getConfigHistory() {
    return this.siteConfigService.getConfigHistory();
  }
}
