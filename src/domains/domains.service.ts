import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import axios from 'axios';

@Injectable()
export class DomainsService {
  constructor(private supabaseService: SupabaseService) {}

  async checkDomainAvailability(
    domain: string,
    extension: string = '.ir',
  ): Promise<{ available: boolean; domain: string; reason?: string }> {
    // Validate domain format
    if (!this.isValidDomain(domain)) {
      throw new BadRequestException('Invalid domain format');
    }

    const fullDomain = `${domain}${extension}`;

    try {
      // Check if domain exists in recent orders
      const { data: existingOrder } = await this.supabaseService
        .getClient()
        .from('orders')
        .select('description')
        .ilike('description', `%${fullDomain}%`)
        .limit(1);

      if (existingOrder && existingOrder.length > 0) {
        return {
          available: false,
          domain: fullDomain,
          reason: 'Domain found in existing orders',
        };
      }

      // Perform basic availability check (simplified)
      // In a real implementation, you might want to use a WHOIS service
      const isAvailable = await this.performAvailabilityCheck(fullDomain);

      return {
        available: isAvailable,
        domain: fullDomain,
        reason: isAvailable ? undefined : 'Domain appears to be registered',
      };
    } catch (error) {
      console.error('Domain availability check error:', error);
      return {
        available: false,
        domain: fullDomain,
        reason: 'Unable to verify domain availability',
      };
    }
  }

  private isValidDomain(domain: string): boolean {
    // Basic domain validation regex
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
    return domainRegex.test(domain) && domain.length >= 2 && domain.length <= 63;
  }

  private async performAvailabilityCheck(domain: string): Promise<boolean> {
    try {
      // This is a simplified check - in production, you'd use a proper WHOIS service
      // For now, we'll simulate availability based on some basic rules
      
      // Check if it's a common reserved domain
      const reservedDomains = [
        'example.ir',
        'test.ir',
        'localhost.ir',
        'admin.ir',
        'www.ir',
      ];

      if (reservedDomains.includes(domain.toLowerCase())) {
        return false;
      }

      // Simulate a network check (in reality, you'd use a WHOIS API)
      // For demonstration purposes, we'll return true for most domains
      return Math.random() > 0.3; // 70% chance of being available
    } catch (error) {
      console.error('Availability check failed:', error);
      return false;
    }
  }

  async searchDomains(query: string): Promise<string[]> {
    // Search for domains in orders that match the query
    const { data, error } = await this.supabaseService
      .getClient()
      .from('orders')
      .select('description')
      .ilike('description', `%${query}%`)
      .limit(10);

    if (error) {
      throw new Error('Failed to search domains');
    }

    // Extract domain names from descriptions
    const domains: string[] = [];
    const domainRegex = /[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.[a-zA-Z]{2,}/g;

    data?.forEach(order => {
      const matches = order.description?.match(domainRegex);
      if (matches) {
        domains.push(...matches);
      }
    });

    return [...new Set(domains)]; // Remove duplicates
  }
}
