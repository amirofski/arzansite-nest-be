import { Injectable, BadRequestException } from '@nestjs/common';
import { AppwriteService } from '../appwrite/appwrite.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Query, ID } from 'node-appwrite';

@Injectable()
export class DomainsService {
  constructor(
    private appwriteService: AppwriteService,
    private configService: ConfigService,
  ) {}

  async checkDomainAvailability(
    domain: string,
    extension: string = '.ir',
  ): Promise<{ available: boolean; domain: string; reason?: string; whoisData?: any }> {
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

      // Perform availability check using IP2WHOIS API
      const result = await this.performAvailabilityCheckWithDetails(fullDomain);

      return {
        available: result.available,
        domain: fullDomain,
        reason: result.available ? 'Domain is available for registration' : 'Domain is already registered',
        whoisData: result.whoisData,
      };
    } catch (error) {
      console.error('Domain availability check error:', error);
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
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

  private async performAvailabilityCheckWithDetails(domain: string): Promise<{ available: boolean; whoisData?: any }> {
    try {
      const apiKey = this.configService.get<string>('IP2WHOIS_API_KEY');
      
      if (!apiKey) {
        console.warn('IP2WHOIS_API_KEY not configured, falling back to basic check');
        return { available: this.fallbackAvailabilityCheck(domain) };
      }

      const apiUrl = 'https://api.ip2whois.com/v2';
      const response = await axios.get(apiUrl, {
        params: {
          key: apiKey,
          domain: domain,
          format: 'json',
        },
        timeout: 10000, // 10 second timeout
      });

      // If we get a successful response with domain data, the domain is registered
      if (response.data && response.data.domain) {
        // Check if domain has an expiry date - if it does, it's registered
        if (response.data.expire_date) {
          const expireDate = new Date(response.data.expire_date);
          const now = new Date();
          
          // If expiry date is in the past, domain might be available
          if (expireDate < now) {
            return { 
              available: true, 
              whoisData: {
                status: 'expired',
                expireDate: response.data.expire_date,
                registrar: response.data.registrar?.name,
              }
            };
          }
          
          // Domain is registered and active
          return { 
            available: false,
            whoisData: {
              status: response.data.status,
              createDate: response.data.create_date,
              updateDate: response.data.update_date,
              expireDate: response.data.expire_date,
              domainAge: response.data.domain_age,
              registrar: response.data.registrar,
              nameservers: response.data.nameservers,
            }
          };
        }
        
        // If domain exists but no expiry date, assume it's registered
        return { 
          available: false,
          whoisData: {
            status: response.data.status,
            registrar: response.data.registrar,
          }
        };
      }

      // If no domain data, it's likely available
      return { available: true };
    } catch (error) {
      // Check for specific API errors
      if (axios.isAxiosError(error) && error.response) {
        const errorData = error.response.data;
        
        // Error code 10006: No data found - domain is available
        if (errorData && errorData.error && errorData.error.error_code === 10006) {
          return { available: true };
        }
        
        // Error code 10007: Invalid domain
        if (errorData && errorData.error && errorData.error.error_code === 10007) {
          throw new BadRequestException('Invalid domain format');
        }

        // Other API errors
        console.error('IP2WHOIS API error:', errorData);
      }
      
      console.error('IP2WHOIS API check failed:', error);
      // Fallback to basic check on error
      return { available: this.fallbackAvailabilityCheck(domain) };
    }
  }

  private async performAvailabilityCheck(domain: string): Promise<boolean> {
    const result = await this.performAvailabilityCheckWithDetails(domain);
    return result.available;
  }

  private fallbackAvailabilityCheck(domain: string): boolean {
    // Fallback check when API is unavailable
    const reservedDomains = [
      'example.ir',
      'example.com',
      'test.ir',
      'test.com',
      'localhost.ir',
      'admin.ir',
      'www.ir',
    ];

    if (reservedDomains.includes(domain.toLowerCase())) {
      return false;
    }

    // Return true (available) by default for fallback
    return true;
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
    const domainExtensionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_DOMAIN_EXTENSIONS') || 'domain_extensions';
    
    try {
      const result = await databases.listDocuments(
        databaseId,
        domainExtensionsCollection,
        [
          Query.equal('available', true),
          Query.orderAsc('extension'),
        ],
      );
      
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
    const domainExtensionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_DOMAIN_EXTENSIONS') || 'domain_extensions';
    
    try {
      const result = await databases.listDocuments(
        databaseId,
        domainExtensionsCollection,
        [
          Query.orderAsc('extension'),
        ],
      );
      
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

  async createDomainExtension(data: { extension: string; price: number; description?: string; available: boolean; isDefault?: boolean }): Promise<any> {
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const domainExtensionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_DOMAIN_EXTENSIONS') || 'domain_extensions';

    try {
      const created = await databases.createDocument(
        databaseId,
        domainExtensionsCollection,
        ID.unique(),
        {
          extension: data.extension,
          price: data.price,
          available: data.available,
          description: data.description || '',
          isDefault: !!data.isDefault,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any,
      );
      return created;
    } catch (error) {
      console.error('Error creating domain extension:', error);
      throw new BadRequestException('Failed to create domain extension');
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
    const domainExtensionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_DOMAIN_EXTENSIONS') || 'domain_extensions';
    
    try {
      const updated = await databases.updateDocument(
        databaseId,
        domainExtensionsCollection,
        extensionId,
        {
          price,
          available,
          updated_at: new Date().toISOString(),
        },
      );
      
      return updated;
    } catch (error) {
      console.error('Error updating domain prices:', error);
      throw new BadRequestException('Failed to update domain prices');
    }
  }

  async deleteDomainExtension(extensionId: string): Promise<{ success: boolean }>{
    const databases = this.appwriteService.getDatabases();
    const databaseId = this.configService.get<string>('APPWRITE_DATABASE_ID');
    const domainExtensionsCollection = this.configService.get<string>('APPWRITE_COLLECTION_DOMAIN_EXTENSIONS') || 'domain_extensions';

    try {
      await databases.deleteDocument(databaseId, domainExtensionsCollection, extensionId);
      return { success: true };
    } catch (error) {
      console.error('Error deleting domain extension:', error);
      throw new BadRequestException('Failed to delete domain extension');
    }
  }
}
