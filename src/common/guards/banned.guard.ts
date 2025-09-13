import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ProfilesService } from '../../profiles/profiles.service';

@Injectable()
export class BannedGuard implements CanActivate {
  constructor(
    private readonly profilesService: ProfilesService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req?.user; // set by JwtGuard on protected routes

    // If no user is attached (public route), allow
    if (!user || !user.id) {
      return true;
    }

    try {
      const profile = await this.profilesService.getProfile(user.id);
      const status = (profile as any)?.status || 'active';
      if (String(status).toLowerCase() === 'banned') {
        throw new ForbiddenException('Your account is banned. Please contact support.');
      }
    } catch (e) {
      // If profile not found, do not block
      return true;
    }

    return true;
  }
}