import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Client, Account } from 'node-appwrite';
import { Request } from 'express';

@Injectable()
export class AppwriteAuthGuard implements CanActivate {
  private client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT || '')
    .setProject(process.env.APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || '');
  private account = new Account(this.client);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    // 1) Accept Authorization: Bearer <jwt>
    const auth = req.headers['authorization'] || '';
    let token = '';
    if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
      token = auth.slice('Bearer '.length);
    }

    // 2) Fallback: accept JWT sent in body (for session endpoint) or cookie named "appwrite_jwt"
    if (!token) {
      token = (req as any).body?.jwt || (req.cookies && req.cookies['appwrite_jwt']);
    }

    if (!token) {
      throw new UnauthorizedException('No JWT provided');
    }

    try {
      // Set JWT to perform a user.get (this validates token)
      this.client.setJWT(token);
      const user = await this.account.get();

      // Attach user to request for controllers to use
      (req as any).user = user;
      return true;
    } catch (err) {
      // Token invalid or expired
      console.error('JWT validation failed:', err.message);
      throw new UnauthorizedException('Invalid Appwrite JWT');
    } finally {
      // Important: clear JWT from client (so it is not reused cross-request)
      this.client.setJWT('');
    }
  }
}
