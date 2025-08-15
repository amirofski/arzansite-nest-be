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
  private readonly requestUrl = 'https://payment.zarinpal.com/pg/v4/payment/request.json';
  private readonly verifyUrl = 'https://payment.zarinpal.com/pg/v4/payment/verify.json';
  private readonly merchantId: string;

  constructor(private readonly configService: ConfigService) {
    this.merchantId = this.configService.get<string>('ZARINPAL_MERCHANT_ID');
    
    if (!this.merchantId) {
      this.logger.warn('ZarinPal configuration missing. Payment gateway will not work properly.');
    }
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

      // Validate amount (minimum 1000 Rials)
      if (paymentData.amount < 1000) {
        throw new BadRequestException('Minimum payment amount is 1,000 Rials');
      }

      const paymentRequest: ZarinPalPaymentRequest = {
        merchant_id: this.merchantId,
        amount: paymentData.amount,
        currency: paymentData.currency || 'IRR', // Default to Rials
        description: paymentData.description,
        callback_url: paymentData.callbackUrl,
        metadata: {},
      };

      // Add optional metadata
      if (paymentData.mobile) {
        paymentRequest.metadata!.mobile = paymentData.mobile;
      }
      if (paymentData.email) {
        paymentRequest.metadata!.email = paymentData.email;
      }
      if (paymentData.orderId) {
        paymentRequest.metadata!.order_id = paymentData.orderId;
      }

      this.logger.log(`Creating payment request: ${JSON.stringify(paymentRequest)}`);

      const response = await axios.post(
        this.requestUrl,
        paymentRequest,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
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
      
      if (error.response?.status === 404) {
        throw new BadRequestException('Payment gateway endpoint not found. Please check configuration.');
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
