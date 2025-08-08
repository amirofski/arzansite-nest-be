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
    Reflect.defineMetadata(ROLES_KEY, roles, descriptor.value);
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
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

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
