import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * RolesGuard.
 * 
 * Think of this as your Express "Authorization Middleware".
 * 
 * 1. It extracts the required roles from the route's metadata (set by @Roles).
 * 2. It grabs the user from the request (attached by JwtStrategy).
 * 3. It compares the user's role with the required roles.
 */
@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        // Get roles from metadata
        const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        // If no roles are defined on the route, allow access
        if (!requiredRoles) {
            return true;
        }

        // Get user from request (set by JwtStrategy during authentication)
        const { user } = context.switchToHttp().getRequest();

        if (!user || !user.role) {
            throw new ForbiddenException('User role not found');
        }

        // Check if user has one of the required roles
        const hasRole = requiredRoles.some((role) => user.role === role);

        if (!hasRole) {
            throw new ForbiddenException('You do not have the required permissions');
        }

        return true;
    }
}
