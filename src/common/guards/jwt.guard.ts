import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwksClient } from 'jwks-client';
import * as jwt from 'jsonwebtoken';
import { UserPayload } from '../decorators/user.decorator';

@Injectable()
export class JwtGuard implements CanActivate {
  private jwksClient: JwksClient;
  private keyCache: Map<string, string> = new Map();

  constructor(private configService: ConfigService) {
    const jwksUrl = this.configService.get<string>('SUPABASE_JWKS_URL');
    this.jwksClient = new JwksClient({
      jwksUri: jwksUrl,
      cache: true,
      cacheMaxEntries: 5,
      cacheMaxAge: 600000, // 10 minutes
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload = await this.verifyToken(token);
      request.user = payload;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private async verifyToken(token: string): Promise<UserPayload> {
    const decoded = jwt.decode(token, { complete: true }) as any;
    
    if (!decoded || !decoded.header.kid) {
      throw new Error('Invalid token format');
    }

    const key = await this.getSigningKey(decoded.header.kid);
    
    const payload = jwt.verify(token, key, {
      algorithms: ['RS256'],
      issuer: this.configService.get<string>('SUPABASE_URL'),
      audience: 'authenticated',
    }) as any;

    // Check if token is expired
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      throw new Error('Token expired');
    }

    return {
      id: payload.sub,
      email: payload.email,
      // Role will be fetched separately by the roles guard when needed
      role: undefined,
    };
  }

  private async getSigningKey(kid: string): Promise<string> {
    if (this.keyCache.has(kid)) {
      return this.keyCache.get(kid)!;
    }

    const key = await this.jwksClient.getSigningKey(kid);
    const publicKey = key.getPublicKey();
    this.keyCache.set(kid, publicKey);
    
    return publicKey;
  }
}
