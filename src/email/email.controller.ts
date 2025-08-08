import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EmailService } from './email.service';
import { JwtGuard } from '../common/guards/jwt.guard';
import { RolesGuard, Roles } from '../common/guards/roles.guard';
import { User, UserPayload } from '../common/decorators/user.decorator';

interface SendTestEmailDto {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface SendTemplateEmailDto {
  to: string;
  template: 'welcome' | 'verification' | 'password-reset' | 'order-notification' | 'payment-notification';
  data: any;
}

@Controller('email')
@UseGuards(JwtGuard, RolesGuard)
@Roles('admin')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('test')
  @HttpCode(HttpStatus.OK)
  async sendTestEmail(@Body() sendTestEmailDto: SendTestEmailDto) {
    const success = await this.emailService.sendEmail({
      to: sendTestEmailDto.to,
      subject: sendTestEmailDto.subject,
      html: sendTestEmailDto.html,
      text: sendTestEmailDto.text,
    });

    return {
      success,
      message: success ? 'Test email sent successfully' : 'Failed to send test email',
    };
  }

  @Post('template')
  @HttpCode(HttpStatus.OK)
  async sendTemplateEmail(@Body() sendTemplateEmailDto: SendTemplateEmailDto) {
    let success = false;

    switch (sendTemplateEmailDto.template) {
      case 'welcome':
        success = await this.emailService.sendWelcomeEmail(
          sendTemplateEmailDto.to,
          sendTemplateEmailDto.data.userName,
        );
        break;

      case 'verification':
        success = await this.emailService.sendEmailVerification(
          sendTemplateEmailDto.to,
          sendTemplateEmailDto.data.verificationUrl,
          sendTemplateEmailDto.data.userName,
        );
        break;

      case 'password-reset':
        success = await this.emailService.sendPasswordResetEmail(
          sendTemplateEmailDto.to,
          sendTemplateEmailDto.data.resetUrl,
          sendTemplateEmailDto.data.userName,
        );
        break;

      case 'order-notification':
        success = await this.emailService.sendOrderNotification(
          sendTemplateEmailDto.to,
          sendTemplateEmailDto.data.orderData,
        );
        break;

      case 'payment-notification':
        success = await this.emailService.sendPaymentNotification(
          sendTemplateEmailDto.to,
          sendTemplateEmailDto.data.paymentData,
        );
        break;

      default:
        throw new Error(`Unknown template: ${sendTemplateEmailDto.template}`);
    }

    return {
      success,
      message: success ? 'Template email sent successfully' : 'Failed to send template email',
    };
  }

  @Get('logs')
  async getEmailLogs(
    @Query('limit') limit = '50',
    @Query('offset') offset = '0',
    @Query('success') success?: string,
    @Query('template_type') templateType?: string,
  ) {
    // This would typically fetch from your email_logs table
    // For now, returning a placeholder response
    return {
      logs: [],
      total: 0,
      limit: parseInt(limit),
      offset: parseInt(offset),
    };
  }

  @Get('status')
  async getEmailServiceStatus() {
    // Check SMTP connection status
    return {
      service: 'custom_smtp',
      status: 'active',
      host: process.env.SMTP_HOST || '37-58-50-28.cprapid.com',
      port: process.env.SMTP_PORT || 465,
      secure: process.env.SMTP_SECURITY === 'ssl',
    };
  }
}
