import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InvoicesService } from '../invoices/invoices.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class ScheduledTasksService {
  private readonly logger = new Logger(ScheduledTasksService.name);

  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly emailService: EmailService,
  ) {}

  // Check for overdue invoices every hour
  @Cron(CronExpression.EVERY_HOUR)
  async checkOverdueInvoices() {
    this.logger.log('Running overdue invoices check...');
    try {
      await this.invoicesService.checkOverdueInvoices();
      this.logger.log('Overdue invoices check completed successfully');
    } catch (error) {
      this.logger.error('Error checking overdue invoices:', error);
    }
  }

  // Auto-pay invoices every 6 hours
  @Cron('0 */6 * * *')
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
  @Cron('0 2 * * *')
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

  // Weekly summary every Sunday at 9 AM
  @Cron('0 9 * * 0')
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
  @Cron('0 3 1 * *')
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
