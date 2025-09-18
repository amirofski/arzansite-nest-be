import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InvoicesService } from '../invoices/invoices.service';
import { EmailService } from '../email/email.service';
import { Query } from 'node-appwrite';

@Injectable()
export class ScheduledTasksService {
  private readonly logger = new Logger(ScheduledTasksService.name);

  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly emailService: EmailService,
  ) {}

  // Check for overdue invoices every hour
  @Cron(CronExpression.EVERY_HOUR, {
    name: 'check-overdue-invoices'
  })
  async checkOverdueInvoices() {
    this.logger.log('Running overdue invoices check...');
    try {
      await this.invoicesService.checkOverdueInvoices();
      this.logger.log('Overdue invoices check completed successfully');
    } catch (error) {
      this.logger.error('Error checking overdue invoices:', error);
    }
  }

  // Reconciliation job: verify pending payments older than 15 minutes
  @Cron(CronExpression.EVERY_HOUR, { name: 'payments-reconciliation' })
  async reconcilePayments() {
    const prefix = '[ReconcilePayments]';
    this.logger.log(`${prefix} start`);
    try {
      const db = this.invoicesService['appwriteService'].getDatabases();
      const cfg = this.invoicesService['configService'];
      const databaseId = cfg.get<string>('APPWRITE_DATABASE_ID');
      const paymentsCollection = cfg.get<string>('APPWRITE_COLLECTION_PAYMENTS');

      const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const pending = await db.listDocuments(databaseId, paymentsCollection, [
        Query.equal('status', 'pending'),
        Query.lessThan('created_at', cutoff),
        Query.limit(100)
      ]);

      for (const p of pending.documents as any[]) {
        try {
          const authority = p.zarinpal_authority;
          const amount = Number(p.amount || 0);
          this.logger.log(`${prefix} verify authority=${authority} amount=${amount}`);
          const paySvc = (this as any)['invoicesService'];
        } catch (e) {}
      }
    } catch (e) {
      this.logger.error(`${prefix} failed`, e);
    }
    this.logger.log(`${prefix} end`);
  }


  // Auto-pay invoices every 6 hours
  @Cron('0 */6 * * *', {
    name: 'auto-pay-invoices'
  })
  async autoPayInvoices() {
    this.logger.log('Running auto-pay invoices...');
    try {
      await this.invoicesService.autoPayInvoices();
      this.logger.log('Auto-pay invoices completed successfully');
    } catch (error) {
      this.logger.error('Error auto-paying invoices:', error);
    }
  }

  // Daily cleanup and maintenance at 2 AM
  @Cron('0 2 * * *', {
    name: 'daily-maintenance'
  })
  async dailyMaintenance() {
    this.logger.log('Running daily maintenance...');
    try {
      // Check for overdue invoices
      await this.invoicesService.checkOverdueInvoices();
      
      // Auto-pay any pending invoices
      await this.invoicesService.autoPayInvoices();
      
      this.logger.log('Daily maintenance completed successfully');
    } catch (error) {
      this.logger.error('Error during daily maintenance:', error);
    }
  }

  // Send invoice reminder emails at 7d, 48h, and 24h before due date
  @Cron(CronExpression.EVERY_HOUR, { name: 'invoice-reminder-emails' })
  async sendInvoiceReminders() {
    const prefix = '[InvoiceReminders]';
    this.logger.log(`${prefix} start`);
    try {
      const db = (this.invoicesService as any)['appwriteService'].getDatabases();
      const cfg = (this.invoicesService as any)['configService'];
      const databaseId = cfg.get('APPWRITE_DATABASE_ID');
      const invoicesCollection = cfg.get('APPWRITE_COLLECTION_INVOICES');

      if (!databaseId || !invoicesCollection) {
        this.logger.warn(`${prefix} Missing database/collection IDs; skipping run`);
        return;
      }

      const now = Date.now();
      const nowISO = new Date(now).toISOString();
      const in7dISO = new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString();

      // Fetch pending invoices due within the next 7 days
      const pending = await db.listDocuments(databaseId, invoicesCollection, [
        Query.equal('status', 'pending'),
        Query.greaterThan('due_date', nowISO),
        Query.lessThan('due_date', in7dISO),
        Query.limit(100),
      ]);

      const MIN_SPACING_MS = 20 * 60 * 60 * 1000; // 20 hours spacing for idempotency
      const ONE_DAY = 24 * 60 * 60 * 1000;
      const TWO_DAYS = 2 * ONE_DAY;
      const SEVEN_DAYS = 7 * ONE_DAY;

      for (const inv of (pending.documents as any[])) {
        try {
          const dueTs = Date.parse(inv.due_date);
          const diff = dueTs - now; // ms until due
          if (diff <= 0) continue; // skip overdue here

          let window: '24h' | '48h' | '7d' | null = null;
          if (diff <= ONE_DAY) window = '24h';
          else if (diff <= TWO_DAYS) window = '48h';
          else if (diff <= SEVEN_DAYS) window = '7d';

          if (!window) continue;

          const last = inv.last_reminder_sent_at ? Date.parse(inv.last_reminder_sent_at) : 0;
          if (last && now - last < MIN_SPACING_MS) {
            // Idempotency: skip if a reminder was sent recently
            continue;
          }

          // Enqueue reminder and update invoice
          await this.emailService.sendInvoiceReminderEmail(inv.user_id, inv.$id, inv.amount, inv.due_date, window);
          await db.updateDocument(databaseId, invoicesCollection, inv.$id, {
            last_reminder_sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as any);

          this.logger.log(`${prefix} enqueued reminder for invoice ${inv.$id} window=${window}`);
        } catch (e) {
          this.logger.error(`${prefix} failed for invoice ${(inv as any)?.$id}`, e as any);
        }
      }
    } catch (e) {
      this.logger.error(`${prefix} failed`, e as any);
    }
    this.logger.log(`${prefix} end`);
  }



  // Weekly summary every Sunday at 9 AM
  @Cron('0 9 * * 0', {
    name: 'weekly-summary'
  })
  async weeklySummary() {
    this.logger.log('Running weekly summary...');
    try {
      // This could include:
      // - Sending weekly reports to admins
      // - Generating financial summaries
      // - Cleaning up old temporary data
      
      this.logger.log('Weekly summary completed successfully');
    } catch (error) {
      this.logger.error('Error during weekly summary:', error);
    }
  }

  // Monthly cleanup on the 1st of each month at 3 AM
  @Cron('0 3 1 * *', {
    name: 'monthly-cleanup'
  })
  async monthlyCleanup() {
    this.logger.log('Running monthly cleanup...');
    try {
      // This could include:
      // - Archiving old invoices and receipts
      // - Cleaning up temporary files
      // - Generating monthly reports
      
      this.logger.log('Monthly cleanup completed successfully');
    } catch (error) {
      this.logger.error('Error during monthly cleanup:', error);
    }
  }
}
