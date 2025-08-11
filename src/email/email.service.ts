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

  constructor(
    private configService: ConfigService,
    private appwriteService: AppwriteService,
  ) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const host = this.configService.get<string>('SMTP_HOST', '37-58-50-28.cprapid.com');
    const port = this.configService.get<number>('SMTP_PORT', 465);
    const user = this.configService.get<string>('SMTP_USER', 'info@arzansite.com');
    const pass = this.configService.get<string>('SMTP_PASS', 'Cya6enCC5rPcs5G');
    const security = this.configService.get<string>('SMTP_SECURITY', 'ssl');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: security === 'ssl', // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
    });

    // Verify connection configuration
    this.transporter.verify((error, success) => {
      if (error) {
        this.logger.error('SMTP connection failed:', error);
      } else {
        this.logger.log('SMTP server is ready to send emails');
      }
    });
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    const {
      to,
      subject,
      html,
      text,
      from = this.configService.get<string>('SMTP_FROM', 'info@arzansite.com'),
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
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully: ${info.messageId}`);
      
      // Log email to database
      await this.logEmailToDatabase({
        to_email: to,
        subject,
        success: true,
        service_used: 'custom_smtp',
        template_type: this.getTemplateType(subject),
        sent_at: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      this.logger.error('Failed to send email:', error);
      
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

  private getTemplateType(subject: string): string {
    if (subject.toLowerCase().includes('verification')) return 'email_verification';
    if (subject.toLowerCase().includes('welcome')) return 'welcome';
    if (subject.toLowerCase().includes('password')) return 'password_reset';
    if (subject.toLowerCase().includes('order')) return 'order_notification';
    if (subject.toLowerCase().includes('payment')) return 'payment_notification';
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
      await databases.createDocument(databaseId, collectionId, ID.unique(), logData as any);
    } catch (error) {
      this.logger.error('Error logging email to database:', error);
    }
  }

  // Email templates
  async sendWelcomeEmail(to: string, userName: string): Promise<boolean> {
    const template = this.getWelcomeTemplate(userName);
    return this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendEmailVerification(to: string, verificationUrl: string, userName?: string): Promise<boolean> {
    const template = this.getEmailVerificationTemplate(verificationUrl, userName);
    return this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  async sendPasswordResetEmail(to: string, resetUrl: string, userName?: string): Promise<boolean> {
    const template = this.getPasswordResetTemplate(resetUrl, userName);
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
}
