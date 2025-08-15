import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface ZarinPalPaymentRequest {
  merchant_id: string;
  amount: number;
  currency?: 'IRR' | 'IRT';
  description: string;
  callback_url: string;
  metadata?: {
    mobile?: string;
    email?: string;
    order_id?: string;
  };
}

export interface ZarinPalPaymentResponse {
  data: {
    code: number;
    message: string;
    authority: string;
    fee_type: string;
    fee: number;
  };
  errors: any[];
}

export interface ZarinPalVerifyRequest {
  merchant_id: string;
  amount: number;
  authority: string;
}

export interface ZarinPalVerifyResponse {
  data: {
    code: number;
    message: string;
    card_hash: string;
    card_pan: string;
    ref_id: number;
    fee_type: string;
    fee: number;
  };
  errors: any[];
}

@Injectable()
export class ZarinPalService {
  private readonly logger = new Logger(ZarinPalService.name);
  private readonly requestUrl: string;
  private readonly verifyUrl: string;
  private readonly merchantId: string;
  private readonly isSandbox: boolean;

  constructor(private readonly configService: ConfigService) {
    this.merchantId = this.configService.get<string>('ZARINPAL_MERCHANT_ID');
    this.isSandbox = this.configService.get<string>('NODE_ENV') === 'development';
    
    // Use sandbox URLs for development
    if (this.isSandbox) {
      this.requestUrl = 'https://sandbox.zarinpal.com/pg/v4/payment/request.json';
      this.verifyUrl = 'https://sandbox.zarinpal.com/pg/v4/payment/verify.json';
    } else {
      this.requestUrl = 'https://payment.zarinpal.com/pg/v4/payment/request.json';
      this.verifyUrl = 'https://payment.zarinpal.com/pg/v4/payment/verify.json';
    }
    
    if (!this.merchantId) {
      this.logger.warn('ZarinPal configuration missing. Payment gateway will not work properly.');
    }
    
    this.logger.log(`ZarinPal service initialized in ${this.isSandbox ? 'sandbox' : 'production'} mode`);
  }

  /**
   * Create a new payment request
   */
  async createPayment(paymentData: {
    amount: number;
    description: string;
    callbackUrl: string;
    mobile?: string;
    email?: string;
    orderId?: string;
    currency?: 'IRR' | 'IRT';
  }): Promise<ZarinPalPaymentResponse> {
    try {
      if (!this.merchantId) {
        throw new BadRequestException('ZarinPal payment gateway not configured');
      }

      // Validate merchant ID format (should be a valid UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(this.merchantId)) {
        throw new BadRequestException('Invalid merchant ID format');
      }

      // Validate amount (minimum 1000 Rials)
      if (paymentData.amount < 1000) {
        throw new BadRequestException('Minimum payment amount is 1,000 Rials');
      }

      // Ensure amount is a positive integer
      if (!Number.isInteger(paymentData.amount) || paymentData.amount <= 0) {
        throw new BadRequestException('Amount must be a positive integer');
      }

      // Check maximum amount (ZarinPal typically has limits)
      if (paymentData.amount > 999999999) {
        throw new BadRequestException('Amount is too high (maximum 999,999,999 Rials)');
      }

      // Validate callback URL format
      try {
        new URL(paymentData.callbackUrl);
      } catch {
        throw new BadRequestException('Invalid callback URL format');
      }

      // Validate description length (ZarinPal typically has a limit)
      if (paymentData.description.length > 255) {
        throw new BadRequestException('Description is too long (maximum 255 characters)');
      }

      if (paymentData.description.trim().length === 0) {
        throw new BadRequestException('Description cannot be empty');
      }

      // Ensure description has minimum length
      if (paymentData.description.trim().length < 3) {
        throw new BadRequestException('Description is too short (minimum 3 characters)');
      }

      // Remove any potentially problematic characters
      const cleanDescription = paymentData.description.trim().replace(/[^\w\s\-\.]/g, '');
      if (cleanDescription.length === 0) {
        throw new BadRequestException('Description contains only invalid characters');
      }

      const paymentRequest: ZarinPalPaymentRequest = {
        merchant_id: this.merchantId,
        amount: paymentData.amount,
        description: cleanDescription,
        callback_url: paymentData.callbackUrl,
        metadata: {},
      };

      // Only include currency if it's explicitly set and not 'IRR' (default)
      if (paymentData.currency && paymentData.currency !== 'IRR') {
        paymentRequest.currency = paymentData.currency;
      }

      // Add optional metadata
      if (paymentData.mobile) {
        // Validate mobile number format (Iranian mobile numbers)
        const mobileRegex = /^09[0-9]{9}$/;
        if (!mobileRegex.test(paymentData.mobile)) {
          throw new BadRequestException('Invalid mobile number format (should start with 09 and be 11 digits)');
        }
        paymentRequest.metadata!.mobile = paymentData.mobile;
      }
      if (paymentData.email) {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(paymentData.email)) {
          throw new BadRequestException('Invalid email format');
        }
        paymentRequest.metadata!.email = paymentData.email;
      }
      if (paymentData.orderId) {
        // Validate order ID format
        if (paymentData.orderId.length > 100) {
          throw new BadRequestException('Order ID is too long (maximum 100 characters)');
        }
        // Clean order ID to remove any problematic characters
        const cleanOrderId = paymentData.orderId.replace(/[^\w\-_]/g, '');
        if (cleanOrderId.length === 0) {
          throw new BadRequestException('Order ID contains only invalid characters');
        }
        paymentRequest.metadata!.order_id = cleanOrderId;
      }

      // Only include metadata if it has content
      if (Object.keys(paymentRequest.metadata!).length === 0) {
        delete paymentRequest.metadata;
      }

      this.logger.log(`Creating payment request: ${JSON.stringify(paymentRequest)}`);

      const response = await axios.post(
        this.requestUrl,
        paymentRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'ArzanSite-Payment-Gateway/1.0',
          },
          timeout: 30000, // 30 seconds timeout
        }
      );

      if (response.data.errors && response.data.errors.length > 0) {
        this.logger.error('ZarinPal API error:', response.data.errors);
        throw new BadRequestException(`Payment request failed: ${response.data.errors[0]?.message || 'Unknown error'}`);
      }

      const result = response.data as ZarinPalPaymentResponse;
      
      if (result.data.code === 100) {
        this.logger.log(`Payment request created successfully. Authority: ${result.data.authority}`);
        return result;
      } else {
        throw new BadRequestException(`Payment request failed: ${result.data.message}`);
      }

    } catch (error) {
      this.logger.error('Failed to create payment request:', error.message);
      
      // Log the full error response for debugging
      if (error.response) {
        this.logger.error('ZarinPal API Response Status:', error.response.status);
        this.logger.error('ZarinPal API Response Data:', JSON.stringify(error.response.data, null, 2));
        this.logger.error('ZarinPal API Response Headers:', JSON.stringify(error.response.headers, null, 2));
      }
      
      if (error.response?.status === 404) {
        throw new BadRequestException('Payment gateway endpoint not found. Please check configuration.');
      }
      
      if (error.response?.status === 422) {
        // Validation error - provide more specific error message
        const errorMessage = error.response.data?.message || error.response.data?.error || 'Invalid request parameters';
        throw new BadRequestException(`Payment validation failed: ${errorMessage}`);
      }
      
      if (error.response?.data) {
        throw new BadRequestException(`Payment request failed: ${error.response.data.message || error.message}`);
      }
      
      throw new BadRequestException(`Payment request failed: ${error.message}`);
    }
  }

  /**
   * Verify payment status
   */
  async verifyPayment(authority: string, amount: number): Promise<ZarinPalVerifyResponse> {
    try {
      if (!this.merchantId) {
        throw new BadRequestException('ZarinPal payment gateway not configured');
      }

      const verifyRequest: ZarinPalVerifyRequest = {
        merchant_id: this.merchantId,
        amount: amount,
        authority: authority,
      };

      this.logger.log(`Verifying payment: ${JSON.stringify(verifyRequest)}`);

      const response = await axios.post(
        this.verifyUrl,
        verifyRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          timeout: 15000,
        }
      );

      if (response.data.errors && response.data.errors.length > 0) {
        this.logger.error('ZarinPal verification error:', response.data.errors);
        throw new BadRequestException(`Payment verification failed: ${response.data.errors[0]?.message || 'Unknown error'}`);
      }

      const result = response.data as ZarinPalVerifyResponse;
      
      if (result.data.code === 100 || result.data.code === 101) {
        // Code 100: First time verification (successful)
        // Code 101: Already verified (also successful)
        this.logger.log(`Payment verified successfully. Ref ID: ${result.data.ref_id}`);
        return result;
      } else {
        throw new BadRequestException(`Payment verification failed: ${result.data.message}`);
      }

    } catch (error) {
      this.logger.error('Failed to verify payment:', error.message);
      throw new BadRequestException(`Payment verification failed: ${error.message}`);
    }
  }

  /**
   * Test connection to ZarinPal API
   */
  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      if (!this.merchantId) {
        return {
          success: false,
          message: 'Merchant ID not configured'
        };
      }

      // Try to create a minimal test payment request
      const testRequest = {
        merchant_id: this.merchantId,
        amount: 1000,
        description: 'Test payment',
        callback_url: 'https://example.com/callback'
      };

      this.logger.log(`Testing ZarinPal connection to: ${this.requestUrl}`);
      this.logger.log(`Test request: ${JSON.stringify(testRequest)}`);

      const response = await axios.post(
        this.requestUrl,
        testRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'ArzanSite-Payment-Gateway/1.0',
          },
          timeout: 10000, // 10 seconds timeout for test
        }
      );

      this.logger.log(`Test response status: ${response.status}`);
      this.logger.log(`Test response data: ${JSON.stringify(response.data)}`);

      return {
        success: true,
        message: 'Connection successful',
        details: {
          status: response.status,
          data: response.data,
          url: this.requestUrl,
          mode: this.isSandbox ? 'sandbox' : 'production'
        }
      };

    } catch (error) {
      this.logger.error('ZarinPal connection test failed:', error.message);
      
      if (error.response) {
        this.logger.error('Response status:', error.response.status);
        this.logger.error('Response data:', JSON.stringify(error.response.data, null, 2));
      }
      
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        details: {
          error: error.message,
          response: error.response?.data,
          status: error.response?.status,
          url: this.requestUrl,
          mode: this.isSandbox ? 'sandbox' : 'production'
        }
      };
    }
  }

  /**
   * Get payment URL for redirect
   */
  getPaymentUrl(authority: string): string {
    return `https://payment.zarinpal.com/pg/StartPay/${authority}`;
  }

  /**
   * Check if payment gateway is configured
   */
  isConfigured(): boolean {
    return !!this.merchantId;
  }

  /**
   * Get merchant ID
   */
  getMerchantId(): string {
    return this.merchantId;
  }
}
