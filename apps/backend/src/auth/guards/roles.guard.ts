import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, AllowedRole } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AllowedRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException('User context not available for authorization');
    }

    // If 'ADMIN' is required and user.type is 'ADMIN'
    if (requiredRoles.includes('ADMIN') && user.type === 'ADMIN') {
      return true;
    }

    // If 'TEAM' is required and user.type is 'TEAM'
    if (requiredRoles.includes('TEAM') && user.type === 'TEAM') {
      return true;
    }

    // If specific AdminRole (e.g. 'SUPER_ADMIN', 'ORGANIZER') is required
    if (user.type === 'ADMIN' && user.role && requiredRoles.includes(user.role)) {
      return true;
    }

    throw new ForbiddenException('You do not have permission to access this resource');
  }
}
