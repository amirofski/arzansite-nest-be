import { Controller, Get, Query, UseGuards, Post, Body } from '@nestjs/common';
import { DomainsService } from './domains.service';
import { JwtGuard } from '../common/guards/jwt.guard';

@Controller('domains')
export class DomainsController {
  constructor(private readonly domainsService: DomainsService) {}

  @Get('check')
  async checkDomainAvailability(
    @Query('domain') domain: string,
    @Query('extension') extension: string = '.ir',
  ) {
    return this.domainsService.checkDomainAvailability(domain, extension);
  }

  @Get('search')
  @UseGuards(JwtGuard)
  async searchDomains(@Query('q') query: string) {
    return this.domainsService.searchDomains(query);
  }

  @Post('check')
  async checkDomainPost(@Body('domain') domain: string, @Body('extension') extension: string = '.ir') {
    return this.domainsService.checkDomainAvailability(domain, extension);
  }
}
