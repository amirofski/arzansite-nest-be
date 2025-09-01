import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppwriteService } from '../../appwrite/appwrite.service';
import { ConfigService } from '@nestjs/config';
import { UserPayload } from '../decorators/user.decorator';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => {
  return (target: any, key?: string, descriptor?: any) => {
    if (descriptor && descriptor.value) {
      // Method decorator
      Reflect.defineMetadata(ROLES_KEY, roles, descriptor.value);
    } else {
      // Class decorator
      Reflect.defineMetadata(ROLES_KEY, roles, target);
    }
    return descriptor;
  };
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private appwriteService: AppwriteService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check for roles at method level first, then class level
    const methodRoles = this.reflector.get<string[]>(
      ROLES_KEY,
      context.getHandler(),
    );
    
    const classRoles = this.reflector.get<string[]>(
      ROLES_KEY,
      context.getClass(),
    );

    const requiredRoles = methodRoles || classRoles;

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: UserPayload = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get user role from Appwrite labels
    const users = this.appwriteService.getUsers();
    const appwriteUser = await users.get(user.id);
    
    // Check if user has admin label
    const hasAdminLabel = appwriteUser.labels && appwriteUser.labels.includes('admin');
    const userRole = hasAdminLabel ? 'admin' : 'user';
    
    const hasRole = requiredRoles.includes(userRole);
    if (!hasRole) {
      throw new ForbiddenException(
        `User does not have required role: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
