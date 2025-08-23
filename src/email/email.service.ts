import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { AppwriteService } from '../appwrite/appwrite.service';
import { ID } from 'node-appwrite';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  constructor(
    private configService: ConfigService,
    private appwriteService: AppwriteService,
  ) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // Get SMTP configuration from environment variables
    const host = this.configService.get<string>('SMTP_HOST');
    let port = this.configService.get<number>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    let security = this.configService.get<string>('SMTP_SECURITY', 'ssl');
    const from = this.configService.get<string>('SMTP_FROM');
    const senderName = this.configService.get<string>('SMTP_SENDER_NAME', 'ArzanSite');

    // Auto-fix common SMTP issues
    if (port === 465 && security === 'ssl') {
      console.log('⚠️ Port 465 with SSL detected - this often has TLS issues');
      console.log('🔄 Auto-switching to port 587 with STARTTLS for better reliability');
      port = 587;
      security = 'starttls';
    }

    // Check if SMTP is enabled
    if (!host || !port || !user || !pass) {
      this.logger.warn('⚠️ SMTP configuration is incomplete. Email service will be disabled.');
      this.logger.warn('   To enable email service, configure the following environment variables:');
      this.logger.warn('   - SMTP_HOST (e.g., 37-58-50-28.cprapid.com)');
      this.logger.warn('   - SMTP_PORT (e.g., 587)');
      this.logger.warn('   - SMTP_USER (e.g., info@arzansite.com)');
      this.logger.warn('   - SMTP_PASS (your SMTP password)');
      this.logger.warn('   - SMTP_FROM (e.g., info@arzansite.com)');
      this.logger.warn('   - SMTP_SECURITY (e.g., starttls)');
      
      // Set transporter to null to indicate SMTP is disabled
      this.transporter = null;
      return;
    }

    this.logger.log(`Initializing SMTP transporter with host: ${host}:${port}`);

    // Try different configurations to handle TLS issues
    const transporterConfig: any = {
      host,
      port,
      auth: {
        user,
        pass,
      },
      // Disable pooling initially to avoid connection issues
      pool: false,
      maxConnections: 1,
      maxMessages: 1,
      rateLimit: 1,
      // Add TLS options to handle connection issues
      tls: {
        rejectUnauthorized: false, // Allow self-signed certificates
        ciphers: 'SSLv3', // Use older cipher for compatibility
      },
      // Add connection timeouts
      connectionTimeout: 30000, // 30 seconds
      greetingTimeout: 30000, // 30 seconds
      socketTimeout: 30000, // 30 seconds
    };

    // Configure security based on port and security setting
    // Prefer port 587 with STARTTLS as it's more reliable than port 465 with SSL
    if (port === 587 || port === 25) {
      transporterConfig.secure = false; // Use STARTTLS
      transporterConfig.requireTLS = true; // Require TLS
      console.log('🔧 Using STARTTLS on port', port);
    } else if (port === 465 && security === 'ssl') {
      transporterConfig.secure = true; // Use SSL
      console.log('🔧 Using SSL on port', port);
    } else {
      transporterConfig.secure = false; // Default to non-secure
      console.log('🔧 Using non-secure connection on port', port);
    }

    this.transporter = nodemailer.createTransport(transporterConfig);

    // Verify connection configuration
    this.verifyConnection();
  }

  private async verifyConnection() {
    // Skip verification if SMTP is disabled
    if (!this.transporter) {
      this.logger.warn('⚠️ Skipping SMTP connection verification - SMTP is disabled');
      return;
    }

    try {
      await this.transporter.verify();
      this.logger.log('✅ SMTP connection verified successfully');
      this.logger.log('SMTP server is ready to send emails');
    } catch (error) {
      this.logger.error('❌ SMTP connection verification failed:', error);
      
      // Handle specific authentication errors
      if (error.code === 'EAUTH' || error.message.includes('535 Incorrect authentication data')) {
        this.logger.error('🔐 SMTP Authentication Error: Invalid username or password');
        this.logger.error('   Please check your SMTP_USER and SMTP_PASS environment variables');
        this.logger.error('   Current SMTP_USER:', this.configService.get<string>('SMTP_USER'));
        this.logger.error('   SMTP_HOST:', this.configService.get<string>('SMTP_HOST'));
        this.logger.error('   SMTP_PORT:', this.configService.get<string>('SMTP_PORT'));
      } else if (error.message.includes('TLS')) {
        this.logger.error('🔧 TLS/SSL connection issue detected. This may be due to:');
        this.logger.error('   - SMTP server configuration issues');
        this.logger.error('   - Firewall/proxy blocking secure connections');
        this.logger.error('   - Incorrect port or security settings');
      } else if (error.code === 'ECONNECTION') {
        this.logger.error('🌐 Connection Error: Cannot connect to SMTP server');
        this.logger.error('   Please check your SMTP_HOST and SMTP_PORT settings');
      }
      
      // Don't throw error immediately, just log it
      // The application can still start, and emails will be attempted
      this.logger.warn('⚠️ SMTP verification failed, but application will continue. Emails may fail.');
      this.logger.warn('💡 To fix SMTP issues, check your .env file and update SMTP credentials');
    }
  }

  async sendEmail(options: EmailOptions, retryCount = 0): Promise<boolean> {
    // Check if SMTP is enabled
    if (!this.transporter) {
      this.logger.error('❌ SMTP is disabled. Cannot send email.');
      this.logger.error('   Please configure SMTP settings in your environment variables.');
      return false;
    }

    const {
      to,
      subject,
      html,
      text,
      from = this.configService.get<string>('SMTP_FROM'),
      replyTo,
    } = options;

    const mailOptions = {
      from: `"${this.configService.get<string>('SMTP_SENDER_NAME', 'ArzanSite')}" <${from}>`,
      to,
      subject,
      html,
      text,
      replyTo,
    };

    try {
      this.logger.log(`📧 Sending email to ${to}: ${subject}`);
      
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`✅ Email sent successfully: ${info.messageId} to ${to}`);
      
      // Log email to database
      await this.logEmailToDatabase({
        to_email: to,
        subject,
        success: true,
        service_used: 'custom_smtp',
        template_type: this.getTemplateType(subject),
        sent_at: new Date().toISOString(),
        // message_id: info.messageId, // Removed to avoid schema validation errors
      });

      return true;
    } catch (error) {
      this.logger.error(`❌ Failed to send email (attempt ${retryCount + 1}) to ${to}:`, error);
      
      // Retry logic for transient failures
      if (retryCount < this.maxRetries && this.isRetryableError(error)) {
        this.logger.log(`🔄 Retrying email send in ${this.retryDelay}ms... (${retryCount + 1}/${this.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.sendEmail(options, retryCount + 1);
      }
      
      // Log failed email to database
      await this.logEmailToDatabase({
        to_email: to,
        subject,
        success: false,
        error_message: error.message,
        service_used: 'custom_smtp',
        template_type: this.getTemplateType(subject),
        sent_at: new Date().toISOString(),
      });

      return false;
    }
  }

  private isRetryableError(error: any): boolean {
    // Don't retry on authentication errors
    if (error.code === 'EAUTH' || error.message.includes('535 Incorrect authentication data')) {
      return false;
    }
    
    // Retry on network errors, timeouts, and temporary SMTP errors
    const retryableCodes = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'EHOSTUNREACH'];
    const retryableMessages = ['timeout', 'connection', 'temporary', 'rate limit', 'quota', 'temporary failure'];
    
    return (
      retryableCodes.some(code => error.code === code) ||
      retryableMessages.some(msg => error.message?.toLowerCase().includes(msg)) ||
      (error.responseCode >= 400 && error.responseCode < 500 && error.responseCode !== 535) // Retry on 4xx errors (except 535 auth error)
    );
  }

  private getTemplateType(subject: string): string {
    const subjectLower = subject.toLowerCase();
    if (subjectLower.includes('verification')) return 'email_verification';
    if (subjectLower.includes('welcome')) return 'welcome';
    if (subjectLower.includes('password')) return 'password_reset';
    if (subjectLower.includes('order')) return 'order_notification';
    if (subjectLower.includes('payment')) return 'payment_notification';
    return 'general';
  }

  private async logEmailToDatabase(logData: {
    to_email: string;
    subject: string;
    success: boolean;
    error_message?: string;
    service_used: string;
    template_type: string;
    sent_at: string;
  }) {
    try {
      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const collectionId = this.configService.get<string>('APPWRITE_COLLECTION_EMAIL_LOGS');
      
      if (!databaseId || !collectionId) {
        this.logger.warn('Email logging skipped: Missing APPWRITE_DATABASE_ID or APPWRITE_COLLECTION_EMAIL_LOGS');
        return;
      }

      await databases.createDocument(databaseId, collectionId, ID.unique(), logData as any);
      this.logger.debug(`📝 Email logged to database: ${logData.success ? 'SUCCESS' : 'FAILED'}`);
    } catch (error) {
      this.logger.error('❌ Error logging email to database:', error);
    }
  }

  async getLogs(params: { limit: number; offset: number; success?: string; template_type?: string }) {
    try {
      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const collectionId = this.configService.get<string>('APPWRITE_COLLECTION_EMAIL_LOGS');
      
      if (!databaseId || !collectionId) {
        throw new Error('Email logging not configured');
      }

      const { Query } = await import('node-appwrite');
      const filters = [Query.limit(params.limit), Query.offset(params.offset), Query.orderDesc('sent_at')];
      
      if (params.success === 'true') filters.push(Query.equal('success', true));
      if (params.success === 'false') filters.push(Query.equal('success', false));
      if (params.template_type) filters.push(Query.equal('template_type', params.template_type));
      
      const res = await databases.listDocuments(databaseId, collectionId, filters);
      
      return {
        logs: (res.documents as any[]) || [],
        total: res.total,
        limit: params.limit,
        offset: params.offset,
      };
    } catch (error) {
      this.logger.error('Error fetching email logs:', error);
      throw error;
    }
  }

  // Enhanced email methods for Appwrite integration
  async sendConfirmationEmail(to: string, verificationUrl: string, userName?: string): Promise<boolean> {
    this.logger.log(`📧 Sending confirmation email to ${to} with verification URL`);
    return this.sendEmailVerification(to, verificationUrl, userName);
  }

  async sendWelcomeEmail(to: string, userName: string): Promise<boolean> {
    this.logger.log(`📧 Sending welcome email to ${to}`);
    const template = this.getWelcomeTemplate(userName);
    return this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendPasswordResetEmail(to: string, resetUrl: string, userName?: string): Promise<boolean> {
    this.logger.log(`📧 Sending password reset email to ${to}`);
    const template = this.getPasswordResetTemplate(resetUrl, userName);
    return this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  // Legacy methods for backward compatibility
  async sendEmailVerification(to: string, verificationUrl: string, userName?: string): Promise<boolean> {
    const template = this.getEmailVerificationTemplate(verificationUrl, userName);
    return this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendOrderNotification(to: string, orderData: any): Promise<boolean> {
    const template = this.getOrderNotificationTemplate(orderData);
    return this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendPaymentNotification(to: string, paymentData: any): Promise<boolean> {
    const template = this.getPaymentNotificationTemplate(paymentData);
    return this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  // Template methods
  private getWelcomeTemplate(userName: string): EmailTemplate {
    return {
      subject: 'Welcome to ArzanSite! 🎉',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Welcome to ArzanSite!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Your account has been successfully created</p>
          </div>
          
          <div style="padding: 40px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Hello ${userName || 'there'}!</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Thank you for joining ArzanSite! We're excited to have you on board and can't wait to help you create amazing websites.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">What you can do now:</h3>
              <ul style="color: #666; line-height: 1.8;">
                <li>Create your first order</li>
                <li>Design your website</li>
                <li>Manage your projects</li>
                <li>Track your payments</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://arzansite.com/dashboard" 
                 style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Go to Dashboard
              </a>
            </div>
            
            <p style="color: #999; font-size: 14px; margin-top: 30px;">
              If you have any questions, feel free to contact us at 
              <a href="mailto:info@arzansite.com" style="color: #667eea;">info@arzansite.com</a>
            </p>
          </div>
          
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p>&copy; 2024 ArzanSite. All rights reserved.</p>
          </div>
        </div>
      `,
      text: `
Welcome to ArzanSite!

Hello ${userName || 'there'}!

Thank you for joining ArzanSite! We're excited to have you on board and can't wait to help you create amazing websites.

What you can do now:
- Create your first order
- Design your website
- Manage your projects
- Track your payments

Go to Dashboard: https://arzansite.com/dashboard

If you have any questions, feel free to contact us at info@arzansite.com

© 2024 ArzanSite. All rights reserved.
      `,
    };
  }

  private getEmailVerificationTemplate(verificationUrl: string, userName?: string): EmailTemplate {
    return {
      subject: 'Verify Your Email - ArzanSite',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Verify Your Email</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Complete your ArzanSite registration</p>
          </div>
          
          <div style="padding: 40px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Hello ${userName || 'there'}!</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Thank you for signing up for ArzanSite! To complete your registration, please verify your email address by clicking the button below.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Verify Email Address
              </a>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              If the button doesn't work, you can copy and paste this link into your browser:
            </p>
            
            <p style="color: #667eea; word-break: break-all; margin-bottom: 20px;">
              ${verificationUrl}
            </p>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="color: #856404; margin: 0; font-size: 14px;">
                <strong>Important:</strong> This verification link will expire in 24 hours for security reasons.
              </p>
            </div>
            
            <p style="color: #999; font-size: 14px; margin-top: 30px;">
              If you didn't create an account with ArzanSite, you can safely ignore this email.
            </p>
          </div>
          
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p>&copy; 2024 ArzanSite. All rights reserved.</p>
          </div>
        </div>
      `,
      text: `
Verify Your Email - ArzanSite

Hello ${userName || 'there'}!

Thank you for signing up for ArzanSite! To complete your registration, please verify your email address by clicking the link below.

Verify Email Address: ${verificationUrl}

Important: This verification link will expire in 24 hours for security reasons.

If you didn't create an account with ArzanSite, you can safely ignore this email.

© 2024 ArzanSite. All rights reserved.
      `,
    };
  }

  private getPasswordResetTemplate(resetUrl: string, userName?: string): EmailTemplate {
    return {
      subject: 'Reset Your Password - ArzanSite',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Reset Your Password</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Secure your ArzanSite account</p>
          </div>
          
          <div style="padding: 40px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Hello ${userName || 'there'}!</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              We received a request to reset your password for your ArzanSite account. Click the button below to create a new password.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              If the button doesn't work, you can copy and paste this link into your browser:
            </p>
            
            <p style="color: #667eea; word-break: break-all; margin-bottom: 20px;">
              ${resetUrl}
            </p>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="color: #856404; margin: 0; font-size: 14px;">
                <strong>Security Notice:</strong> This password reset link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
              </p>
            </div>
          </div>
          
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p>&copy; 2024 ArzanSite. All rights reserved.</p>
          </div>
        </div>
      `,
      text: `
Reset Your Password - ArzanSite

Hello ${userName || 'there'}!

We received a request to reset your password for your ArzanSite account. Click the link below to create a new password.

Reset Password: ${resetUrl}

Security Notice: This password reset link will expire in 1 hour. If you didn't request a password reset, please ignore this email.

© 2024 ArzanSite. All rights reserved.
      `,
    };
  }

  private getOrderNotificationTemplate(orderData: any): EmailTemplate {
    return {
      subject: `Order Update - ${orderData.title || 'Your Order'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Order Update</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">${orderData.title || 'Your Order'}</p>
          </div>
          
          <div style="padding: 40px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Order Status: ${orderData.status}</h2>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">Order Details:</h3>
              <p><strong>Order ID:</strong> ${orderData.id}</p>
              <p><strong>Title:</strong> ${orderData.title}</p>
              <p><strong>Price:</strong> $${orderData.price}</p>
              <p><strong>Status:</strong> ${orderData.status}</p>
              ${orderData.description ? `<p><strong>Description:</strong> ${orderData.description}</p>` : ''}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://arzansite.com/orders/${orderData.id}" 
                 style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                View Order
              </a>
            </div>
          </div>
          
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p>&copy; 2024 ArzanSite. All rights reserved.</p>
          </div>
        </div>
      `,
      text: `
Order Update - ${orderData.title || 'Your Order'}

Order Status: ${orderData.status}

Order Details:
- Order ID: ${orderData.id}
- Title: ${orderData.title}
- Price: $${orderData.price}
- Status: ${orderData.status}
${orderData.description ? `- Description: ${orderData.description}` : ''}

View Order: https://arzansite.com/orders/${orderData.id}

© 2024 ArzanSite. All rights reserved.
      `,
    };
  }

  private getPaymentNotificationTemplate(paymentData: any): EmailTemplate {
    return {
      subject: `Payment ${paymentData.status} - ${paymentData.order_title || 'Your Payment'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Payment ${paymentData.status}</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">${paymentData.order_title || 'Your Payment'}</p>
          </div>
          
          <div style="padding: 40px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Payment Details</h2>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">Transaction Information:</h3>
              <p><strong>Payment ID:</strong> ${paymentData.id}</p>
              <p><strong>Amount:</strong> $${paymentData.amount}</p>
              <p><strong>Status:</strong> ${paymentData.status}</p>
              <p><strong>Date:</strong> ${new Date(paymentData.created_at).toLocaleDateString()}</p>
              ${paymentData.order_title ? `<p><strong>Order:</strong> ${paymentData.order_title}</p>` : ''}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://arzansite.com/payments/${paymentData.id}" 
                 style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                View Payment Details
              </a>
            </div>
          </div>
          
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p>&copy; 2024 ArzanSite. All rights reserved.</p>
          </div>
        </div>
      `,
      text: `
Payment ${paymentData.status} - ${paymentData.order_title || 'Your Payment'}

Payment Details:
- Payment ID: ${paymentData.id}
- Amount: $${paymentData.amount}
- Status: ${paymentData.status}
- Date: ${new Date(paymentData.created_at).toLocaleDateString()}
${paymentData.order_title ? `- Order: ${paymentData.order_title}` : ''}

View Payment Details: https://arzansite.com/payments/${paymentData.id}

© 2024 ArzanSite. All rights reserved.
      `,
    };
  }

  // New email templates for wallet and invoice management
  async sendWalletTopUpEmail(userId: string, amount: number, refId: string): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user) return;

    const template = this.getWalletTopUpTemplate(amount, refId);
    await this.sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendInvoiceCreatedEmail(userId: string, invoiceId: string, amount: number): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user) return;

    const template = this.getInvoiceCreatedTemplate(invoiceId, amount);
    await this.sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendInvoicePaidEmail(userId: string, invoiceId: string, amount: number): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user) return;

    const template = this.getInvoicePaidTemplate(invoiceId, amount);
    await this.sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendInvoiceOverdueEmail(userId: string, invoiceId: string, amount: number): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user) return;

    const template = this.getInvoiceOverdueTemplate(invoiceId, amount);
    await this.sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendReceiptCreatedEmail(userId: string, receiptId: string, amount: number): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user) return;

    const template = this.getReceiptCreatedTemplate(receiptId, amount);
    await this.sendInvoiceCreatedEmail(userId, receiptId, amount);
  }

  private getWalletTopUpTemplate(amount: number, refId: string): EmailTemplate {
    return {
      subject: 'Wallet Top-up Successful',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 40px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Wallet Top-up Successful!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Your wallet has been credited successfully</p>
          </div>
          
          <div style="padding: 40px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Transaction Details</h2>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">Top-up Information:</h3>
              <p><strong>Amount:</strong> ${amount.toLocaleString()} Rials</p>
              <p><strong>Reference ID:</strong> ${refId}</p>
              <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://arzansite.com/wallet" 
                 style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                View Wallet
              </a>
            </div>
          </div>
          
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p>&copy; 2024 ArzanSite. All rights reserved.</p>
          </div>
        </div>
      `,
      text: `
Wallet Top-up Successful!

Your wallet has been credited successfully.

Transaction Details:
- Amount: ${amount.toLocaleString()} Rials
- Reference ID: ${refId}
- Date: ${new Date().toLocaleDateString()}

View Wallet: https://arzansite.com/wallet

© 2024 ArzanSite. All rights reserved.
      `,
    };
  }

  private getInvoiceCreatedTemplate(invoiceId: string, amount: number): EmailTemplate {
    return {
      subject: 'New Invoice Created',
      html: `
        <div style="font-family: Arial, excellent; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%); padding: 40px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">New Invoice Created</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">A new invoice has been generated for your order</p>
          </div>
          
          <div style="padding: 40px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Invoice Details</h2>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">Invoice Information:</h3>
              <p><strong>Invoice ID:</strong> ${invoiceId}</p>
              <p><strong>Amount:</strong> ${amount.toLocaleString()} Rials</p>
              <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://arzansite.com/invoices/${invoiceId}" 
                 style="background: #ffc107; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                View Invoice
              </p>
            </div>
          </div>
          
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p>&copy; 2024 ArzanSite. All rights reserved.</p>
          </div>
        </div>
      `,
      text: `
New Invoice Created

A new invoice has been generated for your order.

Invoice Details:
- Invoice ID: ${invoiceId}
- Amount: ${amount.toLocaleString()} Rials
- Date: ${new Date().toLocaleDateString()}

View Invoice: https://arzansite.com/invoices/${invoiceId}

© 2024 ArzanSite. All rights reserved.
      `,
    };
  }

  private getInvoicePaidTemplate(invoiceId: string, amount: number): EmailTemplate {
    return {
      subject: 'Invoice Paid Successfully',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 40px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Invoice Paid Successfully!</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Your invoice has been paid from your wallet</p>
          </div>
          
          <div style="padding: 40px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Payment Details</h2>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">Payment Information:</h3>
              <p><strong>Invoice ID:</strong> ${invoiceId}</p>
              <p><strong>Amount:</strong> ${amount.toLocaleString()} Rials</p>
              <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://arzansite.com/invoices/${invoiceId}" 
                 style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                View Invoice
              </a>
            </div>
          </div>
          
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p>&copy; 2024 ArzanSite. All rights reserved.</p>
          </div>
        </div>
      `,
      text: `
Invoice Paid Successfully!

Your invoice has been paid from your wallet.

Payment Details:
- Invoice ID: ${invoiceId}
- Amount: ${amount.toLocaleString()} Rials
- Date: ${new Date().toLocaleDateString()}

View Invoice: https://arzansite.com/invoices/${invoiceId}

© 2024 ArzanSite. All rights reserved.
      `,
    };
  }

  private getInvoiceOverdueTemplate(invoiceId: string, amount: number): EmailTemplate {
    return {
      subject: 'Invoice Payment Overdue',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 40px; text-align: string; padding: 40px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Invoice Payment Overdue</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Please pay your overdue invoice as soon as possible</p>
          </div>
          
          <div style="padding: 40px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Overdue Invoice</h2>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">Invoice Information:</h3>
              <p><strong>Invoice ID:</strong> ${invoiceId}</p>
              <p><strong>Amount:</strong> ${amount.toLocaleString()} Rials</p>
              <p><strong>Status:</strong> Overdue</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://arzansite.com/invoices/${invoiceId}" 
                 style="background: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Pay Now
              </a>
            </div>
          </div>
          
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p>&copy; 2024 ArzanSite. All rights reserved.</p>
          </div>
        </div>
      `,
      text: `
Invoice Payment Overdue

Please pay your overdue invoice as soon as possible.

Invoice Information:
- Invoice ID: ${invoiceId}
- Amount: ${amount.toLocaleString()} Rials
- Status: Overdue

Pay Now: https://arzansite.com/invoices/${invoiceId}

© 2024 ArzanSite. All rights reserved.
      `,
    };
  }

  private getReceiptCreatedTemplate(receiptId: string, amount: number): EmailTemplate {
    return {
      subject: 'Payment Receipt Created',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #17a2b8 0%, #138496 100%); padding: 40px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Payment Receipt Created</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Your payment receipt is ready for download</p>
          </div>
          
          <div style="padding: 40px; background: #f9f9f9;">
            <h2 style="color: #333; margin-bottom: 20px;">Receipt Details</h2>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">Receipt Information:</h3>
              <p><strong>Receipt ID:</strong> ${receiptId}</p>
              <p><strong>Amount:</strong> ${amount.toLocaleString()} Rials</p>
              <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://arzansite.com/receipts/${receiptId}/download" 
                 style="background: #17a2b8; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Download Receipt
              </a>
            </div>
          </div>
          
          <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
            <p>&copy; 2024 ArzanSite. All rights reserved.</p>
          </div>
        </div>
      `,
      text: `
Payment Receipt Created

Your payment receipt is ready for download.

Receipt Details:
- Receipt ID: ${receiptId}
- Amount: ${amount.toLocaleString()} Rials
- Date: ${new Date().toLocaleDateString()}

Download Receipt: https://arzansite.com/receipts/${receiptId}/download

© 2024 ArzanSite. All rights reserved.
      `,
    };
  }

  private async getUserById(userId: string): Promise<any> {
    try {
      const databases = this.appwriteService.getDatabases();
      const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
      const profilesCollection = this.configService.get<string>('APPWRITE_COLLECTION_PROFILES');
      
      const { Query } = await import('node-appwrite');
      const result = await databases.listDocuments(databaseId, profilesCollection, [
        Query.equal('user_id', userId),
        Query.limit(1),
      ]);
      
      return result.documents[0] || null;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  /**
   * Check if SMTP is enabled and configured
   */
  isSMTPEnabled(): boolean {
    return this.transporter !== null;
  }

  /**
   * Get SMTP configuration status
   */
  getSMTPStatus(): {
    enabled: boolean;
    configured: boolean;
    host?: string;
    port?: number;
    user?: string;
    from?: string;
    security?: string;
    message?: string;
  } {
    if (!this.transporter) {
      return {
        enabled: false,
        configured: false,
        message: 'SMTP is disabled due to missing configuration'
      };
    }

    return {
      enabled: true,
      configured: true,
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      user: this.configService.get<string>('SMTP_USER'),
      from: this.configService.get<string>('SMTP_FROM'),
      security: this.configService.get<string>('SMTP_SECURITY')
    };
  }
}
