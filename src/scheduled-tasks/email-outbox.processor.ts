import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EmailOutboxService } from '../email/email-outbox.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class EmailOutboxProcessor {
  private readonly logger = new Logger(EmailOutboxProcessor.name);

  // Base backoff: 1 minute * 2^attempts
  private baseMs = 60_000;
  private maxAttempts = 5;

  constructor(
    private readonly outbox: EmailOutboxService,
    private readonly emailService: EmailService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async processPending() {
    const items = await this.outbox.listPending(100);
    const now = Date.now();

    for (const item of items) {
      const createdTs = Date.parse(item.created_at);
      const delay = this.baseMs * Math.pow(2, item.attempts || 0);
      if (now < createdTs + delay) {
        continue; // backoff window not reached yet
      }

      try {
        // Dispatch by type
        await this.deliver(item.type, item.payload);
        await this.outbox.markSent(item.$id!);
      } catch (e: any) {
        const attempts = Math.min((item.attempts || 0) + 1, this.maxAttempts);
        await this.outbox.markFailed(item.$id!, attempts, e?.message || 'send failed');
      }
    }
  }

  private async deliver(type: string, payload: any) {
    switch (type) {
      case 'welcome':
        await this.emailService.sendEmail({ to: payload.to, subject: payload.subject, html: payload.html, text: payload.text });
        return;
      case 'email_verification':
        await this.emailService.sendEmail({ to: payload.to, subject: payload.subject, html: payload.html, text: payload.text });
        return;
      case 'password_reset':
      case 'magic_link':
      case 'order_notification':
      case 'payment_notification':
      case 'invoice_created':
      case 'invoice_paid':
      case 'invoice_overdue':
      case 'invoice_reminder':
      case 'receipt_created':
      case 'wallet_topup':
        await this.emailService.sendEmail({ to: payload.to, subject: payload.subject, html: payload.html, text: payload.text });
        return;
      default:
        // fallback: attempt generic
        await this.emailService.sendEmail({ to: payload.to, subject: payload.subject, html: payload.html, text: payload.text });
    }
  }
}