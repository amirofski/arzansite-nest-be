import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppwriteService } from '../../appwrite/appwrite.service';
import { Account, Client } from 'node-appwrite';
import { UserPayload } from '../decorators/user.decorator';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly appwriteService: AppwriteService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    const user = await this.verifyWithAppwrite(token).catch(() => null);
    if (!user) throw new UnauthorizedException('Invalid token');
    request.user = { id: user.$id, email: user.email, role: undefined } as UserPayload;
    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private async verifyWithAppwrite(jwt: string): Promise<any> {
    const endpoint = this.configService.get<string>('APPWRITE_ENDPOINT');
    const projectId = this.configService.get<string>('APPWRITE_PROJECT_ID');
    if (!endpoint || !projectId) throw new Error('Appwrite not configured');
    const client = new Client().setEndpoint(endpoint).setProject(projectId).setJWT(jwt);
    const account = new Account(client);
    return account.get();
  }
}
