import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseService } from '../../supabase/supabase.service';
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
    private supabaseService: SupabaseService,
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

    // Get user role from database
    const { data: userRole, error } = await this.supabaseService
      .getClient()
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (error || !userRole) {
      throw new ForbiddenException('User role not found');
    }

    const hasRole = requiredRoles.includes(userRole.role);
    if (!hasRole) {
      throw new ForbiddenException(
        `User does not have required role: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
