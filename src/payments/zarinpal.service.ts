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
      this.logger.log(`Creating payment with data: ${JSON.stringify(paymentData)}`);
      
      if (!this.merchantId) {
        throw new BadRequestException('ZarinPal payment gateway not configured');
      }

      this.logger.log(`Merchant ID: ${this.merchantId}`);
      this.logger.log(`Amount (Rials): ${paymentData.amount}`);
      this.logger.log(`Description: "${paymentData.description}"`);
      this.logger.log(`Callback URL: ${paymentData.callbackUrl}`);

      // Validate merchant ID format (should be a valid UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(this.merchantId)) {
        throw new BadRequestException('Invalid merchant ID format');
      }

      // Validate amount (minimum 1000 Rials = 100 Tomans)
      this.logger.log(`Validating amount: ${paymentData.amount} Rials (type: ${typeof paymentData.amount})`);
      
      if (paymentData.amount < 1000) {
        this.logger.error(`Amount ${paymentData.amount} Rials is below minimum 1000 Rials`);
        throw new BadRequestException('Minimum payment amount is 1,000 Rials');
      }

      // Ensure amount is a positive integer
      if (!Number.isInteger(paymentData.amount) || paymentData.amount <= 0) {
        this.logger.error(`Amount ${paymentData.amount} is not a positive integer`);
        throw new BadRequestException('Amount must be a positive integer');
      }

      // Check maximum amount (ZarinPal typically has limits)
      // Updated for Iranian market - allow up to 1 billion Rials (1,000,000,000) = 100 million Tomans
      if (paymentData.amount > 1000000000) {
        this.logger.error(`Amount ${paymentData.amount} Rials exceeds maximum 1000000000 Rials`);
        throw new BadRequestException('Amount is too high (maximum 1,000,000,000 Rials)');
      }
      
      // Convert Rials to Tomans (1 Toman = 10 Rials)
      const amountInTomans = Math.floor(paymentData.amount / 10);
      this.logger.log(`Amount conversion: ${paymentData.amount} Rials → ${amountInTomans} Tomans`);
      this.logger.log(`Amount validation passed: ${paymentData.amount} Rials (${amountInTomans} Tomans)`);

      // Validate callback URL format
      try {
        const callbackUrl = new URL(paymentData.callbackUrl);
        this.logger.log(`Callback URL parsed successfully: ${callbackUrl.toString()}`);
        
        // Ensure it's HTTPS for production
        if (!this.isSandbox && callbackUrl.protocol !== 'https:') {
          throw new BadRequestException('Callback URL must use HTTPS in production');
        }
        
        // Additional validation: ensure URL is properly formatted
        if (!callbackUrl.hostname || callbackUrl.hostname.length === 0) {
          throw new BadRequestException('Callback URL must have a valid hostname');
        }
        
        // Log the parsed URL components for debugging
        this.logger.log(`Callback URL components: protocol=${callbackUrl.protocol}, hostname=${callbackUrl.hostname}, pathname=${callbackUrl.pathname}`);
        
      } catch (urlError) {
        this.logger.error(`Callback URL validation failed: ${urlError.message}`);
        throw new BadRequestException(`Invalid callback URL format: ${paymentData.callbackUrl}`);
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

      // Clean description - allow Persian/Arabic text, numbers, spaces, hyphens, dots
      // This regex allows: Persian/Arabic letters, English letters, numbers, spaces, hyphens, dots, commas
      const cleanDescription = paymentData.description.trim().replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\w\s\-\.،]/g, '');
      
      this.logger.log(`Original description: "${paymentData.description}"`);
      this.logger.log(`Cleaned description: "${cleanDescription}"`);
      this.logger.log(`Description length before: ${paymentData.description.length}, after: ${cleanDescription.length}`);
      
      if (cleanDescription.length === 0) {
        throw new BadRequestException('Description contains only invalid characters');
      }

      // Ensure cleaned description still meets minimum length
      if (cleanDescription.length < 3) {
        throw new BadRequestException('Description is too short after cleaning (minimum 3 characters)');
      }

      const paymentRequest: ZarinPalPaymentRequest = {
        merchant_id: this.merchantId,
        amount: amountInTomans, // Use amountInTomans for the request
        currency: 'IRT', // Explicitly set to Iranian Tomans
        description: cleanDescription,
        callback_url: paymentData.callbackUrl,
        metadata: {},
      };

      // Only include currency if it's explicitly set and not 'IRR' (default)
      // Since we're converting to Tomans, always use 'IRT'
      // if (paymentData.currency && paymentData.currency !== 'IRR') {
      //   paymentRequest.currency = paymentData.currency;
      // }

      // Add optional metadata
      if (paymentData.mobile) {
        // Validate mobile number format (Iranian mobile numbers)
        const mobileRegex = /^09[0-9]{9}$/;
        if (!mobileRegex.test(paymentData.mobile)) {
          throw new BadRequestException('Invalid mobile number format (should start with 09 and be 11 digits)');
        }
        paymentRequest.metadata!.mobile = paymentData.mobile;
        this.logger.log(`Added mobile to metadata: ${paymentData.mobile}`);
      }
      if (paymentData.email) {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(paymentData.email)) {
          throw new BadRequestException('Invalid email format');
        }
        paymentRequest.metadata!.email = paymentData.email;
        this.logger.log(`Added email to metadata: ${paymentData.email}`);
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
        this.logger.log(`Added order_id to metadata: ${cleanOrderId}`);
      }

      // Only include metadata if it has content
      if (Object.keys(paymentRequest.metadata!).length === 0) {
        delete paymentRequest.metadata;
        this.logger.log('No metadata to include, removing metadata field');
      } else {
        this.logger.log(`Final metadata: ${JSON.stringify(paymentRequest.metadata)}`);
      }

      this.logger.log(`Final payment request: ${JSON.stringify(paymentRequest)}`);
      this.logger.log(`Request URL: ${this.requestUrl}`);
      this.logger.log(`Sandbox mode: ${this.isSandbox}`);

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

      this.logger.log(`ZarinPal response status: ${response.status}`);
      this.logger.log(`ZarinPal response data: ${JSON.stringify(response.data, null, 2)}`);

      // Robust response parsing
      const responseData = response.data;
      
      // Check for errors array first
      if (responseData.errors && Array.isArray(responseData.errors) && responseData.errors.length > 0) {
        const errorMessage = responseData.errors[0]?.message || 'Unknown ZarinPal error';
        this.logger.error('ZarinPal API error:', responseData.errors);
        throw new BadRequestException(`Payment request failed: ${errorMessage}`);
      }

      // Check for error field
      if (responseData.error) {
        const errorMessage = responseData.error || 'Unknown ZarinPal error';
        this.logger.error('ZarinPal API error:', responseData.error);
        throw new BadRequestException(`Payment request failed: ${errorMessage}`);
      }

      // Check for data structure
      if (!responseData.data) {
        this.logger.error('ZarinPal response missing data field:', responseData);
        throw new BadRequestException('Invalid response from payment gateway');
      }

      const result = responseData as ZarinPalPaymentResponse;
      
      // Check response code
      if (result.data.code === 100) {
        this.logger.log(`Payment request created successfully. Authority: ${result.data.authority}`);
        return result;
      } else {
        const errorMessage = result.data.message || 'Payment request failed';
        this.logger.error(`ZarinPal payment failed with code ${result.data.code}: ${errorMessage}`);
        throw new BadRequestException(`Payment request failed: ${errorMessage}`);
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
  async verifyPayment(authority: string, amountInRials: number): Promise<ZarinPalVerifyResponse> {
    try {
      if (!this.merchantId) {
        throw new BadRequestException('ZarinPal payment gateway not configured');
      }

      // Convert Rials to Tomans for verification
      const amountInTomans = Math.floor(amountInRials / 10);
      
      const verifyRequest: ZarinPalVerifyRequest = {
        merchant_id: this.merchantId,
        amount: amountInTomans, // Use Tomans for verification
        authority: authority,
      };

      this.logger.log(`Verifying payment: ${JSON.stringify(verifyRequest)}`);
      this.logger.log(`Amount conversion for verification: ${amountInRials} Rials → ${amountInTomans} Tomans`);

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

      this.logger.log(`ZarinPal verification response status: ${response.status}`);
      this.logger.log(`ZarinPal verification response data: ${JSON.stringify(response.data, null, 2)}`);

      const responseData = response.data;

      // Check for errors array first
      if (responseData.errors && Array.isArray(responseData.errors) && responseData.errors.length > 0) {
        const errorMessage = responseData.errors[0]?.message || 'Unknown ZarinPal verification error';
        this.logger.error('ZarinPal verification error:', responseData.errors);
        throw new BadRequestException(`Payment verification failed: ${errorMessage}`);
      }

      // Check for error field
      if (responseData.error) {
        const errorMessage = responseData.error || 'Unknown ZarinPal verification error';
        this.logger.error('ZarinPal verification error:', responseData.error);
        throw new BadRequestException(`Payment verification failed: ${errorMessage}`);
      }

      // Check for data structure
      if (!responseData.data) {
        this.logger.error('ZarinPal verification response missing data field:', responseData);
        throw new BadRequestException('Invalid verification response from payment gateway');
      }

      const result = responseData as ZarinPalVerifyResponse;
      
      if (result.data.code === 100 || result.data.code === 101) {
        // Code 100: First time verification (successful)
        // Code 101: Already verified (also successful)
        this.logger.log(`Payment verified successfully. Ref ID: ${result.data.ref_id}`);
        return result;
      } else {
        const errorMessage = result.data.message || 'Payment verification failed';
        this.logger.error(`ZarinPal verification failed with code ${result.data.code}: ${errorMessage}`);
        throw new BadRequestException(`Payment verification failed: ${errorMessage}`);
      }

    } catch (error) {
      this.logger.error('Failed to verify payment:', error.message);
      
      // Log the full error response for debugging
      if (error.response) {
        this.logger.error('ZarinPal verification response status:', error.response.status);
        this.logger.error('ZarinPal verification response data:', JSON.stringify(error.response.data, null, 2));
      }
      
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
