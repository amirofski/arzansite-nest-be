import { Controller, Post, Headers, Body, BadRequestException, HttpCode } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('appwrite/functions')
export class AppwriteFunctionsController {
  constructor(private readonly configService: ConfigService) {}

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Headers('x-appwrite-webhook') signature: string,
    @Headers('x-appwrite-event') event: string,
    @Body() payload: any,
  ) {
    const expected = this.configService.get<string>('APPWRITE_WEBHOOK_SECRET');
    if (!expected || signature !== expected) {
      throw new BadRequestException('Invalid webhook signature');
    }

    // Basic router for events – extend as needed
    switch (event) {
      // e.g. 'databases.*.collections.*.documents.*.create'
      default:
        break;
    }

    return { ok: true };
  }
}


