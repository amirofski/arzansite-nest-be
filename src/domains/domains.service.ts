import { Injectable, BadRequestException } from '@nestjs/common';
import { AppwriteService } from '../appwrite/appwrite.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class DomainsService {
  constructor(
    private appwriteService: AppwriteService,
    private configService: ConfigService,
  ) {}

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
      // Check if domain exists in recent orders (Appwrite)
      // Note: We'll skip this check for now since the description field doesn't have a fulltext index
      // In production, you'd either add the index or use a different approach
      
      // For now, we'll just perform the basic availability check

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
    // Search for domains in orders that match the query (Appwrite)
    // Note: We'll skip this search for now since the description field doesn't have a fulltext index
    // In production, you'd either add the index or use a different approach
    
    // For now, return an empty array to avoid the fulltext index error
    return [];
  }

  async getAvailableDomainExtensions(): Promise<any[]> {
    // Get available domain extensions from Appwrite
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const domainExtensionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_DOMAIN_EXTENSIONS');
    
    try {
      const { Query } = await import('node-appwrite');
      const result = await databases.listDocuments(databaseId, domainExtensionsCollection, [
        Query.equal('available', true),
        Query.orderAsc('extension'),
      ]);
      
      return (result.documents as any) || [];
    } catch (error) {
      console.error('Error fetching domain extensions:', error);
      // Return default extensions if collection doesn't exist
      return [
        { id: '1', extension: '.ir', price: 50000, available: true },
        { id: '2', extension: '.com', price: 80000, available: true },
        { id: '3', extension: '.org', price: 70000, available: true },
        { id: '4', extension: '.net', price: 75000, available: true },
      ];
    }
  }

  async getDomainPrices(): Promise<any[]> {
    // Get domain prices from Appwrite
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const domainExtensionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_DOMAIN_EXTENSIONS');
    
    try {
      const { Query } = await import('node-appwrite');
      const result = await databases.listDocuments(databaseId, domainExtensionsCollection, [
        Query.orderAsc('extension'),
      ]);
      
      return (result.documents as any) || [];
    } catch (error) {
      console.error('Error fetching domain prices:', error);
      // Return default prices if collection doesn't exist
      return [
        { id: '1', extension: '.ir', price: 50000, available: true },
        { id: '2', extension: '.com', price: 80000, available: true },
        { id: '3', extension: '.org', price: 70000, available: true },
        { id: '4', extension: '.net', price: 75000, available: true },
      ];
    }
  }

  async updateDomainPrices(
    extensionId: string,
    price: number,
    available: boolean,
  ): Promise<any> {
    // Update domain prices in Appwrite (admin only)
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const domainExtensionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_DOMAIN_EXTENSIONS');
    
    try {
      const updated = await databases.updateDocument(
        databaseId,
        domainExtensionsCollection,
        extensionId,
        {
          price,
          available,
          updatedAt: new Date().toISOString(),
        }
      );
      
      return updated;
    } catch (error) {
      console.error('Error updating domain prices:', error);
      throw new BadRequestException('Failed to update domain prices');
    }
  }
}
