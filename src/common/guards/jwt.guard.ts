import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppwriteService } from '../../appwrite/appwrite.service';
import { Account, Client } from 'node-appwrite';
import { UserPayload } from '../decorators/user.decorator';
import * as jsonwebtoken from 'jsonwebtoken';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly appwriteService: AppwriteService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromRequest(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    // 1) Try verifying as backend JWT first
    const backendUser = this.verifyBackendJwt(token);
    if (backendUser) {
      request.user = backendUser;
      return true;
    }

    // 2) Fallback to Appwrite JWT
    const appwriteUser = await this.verifyWithAppwrite(token).catch(() => null);
    if (!appwriteUser) throw new UnauthorizedException('Invalid token');
    request.user = { id: appwriteUser.$id, email: appwriteUser.email, role: undefined } as UserPayload;
    return true;
  }

  private extractTokenFromRequest(request: any): string | undefined {
    // 1) Authorization header: Bearer <token>
    const [type, bearerToken] = request.headers.authorization?.split(' ') ?? [];
    if (type === 'Bearer' && bearerToken) {
      return bearerToken;
    }

    // 2) HttpOnly cookie set by backend after /auth/session: appwrite_jwt
    const cookieToken: string | undefined = request?.cookies?.['appwrite_jwt'];
    if (cookieToken && typeof cookieToken === 'string') {
      return cookieToken;
    }

    // 3) Fallbacks sometimes used by auth endpoints
    if (request?.body?.jwt && typeof request.body.jwt === 'string') {
      return request.body.jwt;
    }
    if (request?.body?.appwriteJwt && typeof request.body.appwriteJwt === 'string') {
      return request.body.appwriteJwt;
    }

    return undefined;
  }

  private async verifyWithAppwrite(jwt: string): Promise<any> {
    const endpoint = this.configService.get<string>('APPWRITE_ENDPOINT');
    const projectId = this.configService.get<string>('APPWRITE_PROJECT_ID');
    if (!endpoint || !projectId) throw new Error('Appwrite not configured');
    const client = new Client().setEndpoint(endpoint).setProject(projectId).setJWT(jwt);
    const account = new Account(client);
    return account.get();
  }

  private verifyBackendJwt(token: string): UserPayload | null {
    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      if (!secret) return null;
      const decoded: any = jsonwebtoken.verify(token, secret);
      // Expect payload: { sub, email }
      if (!decoded?.sub || !decoded?.email) return null;
      return { id: decoded.sub, email: decoded.email, role: undefined } as UserPayload;
    } catch {
      return null;
    }
  }
}
