import { SetMetadata } from '@nestjs/common';

/**
 * Roles Decorator.
 * 
 * In Express, you might pass allowed roles to a middleware function.
 * In NestJS, we use decorators to attach 'metadata' to a route.
 * This metadata is then read by a Guard to decide if access is allowed.
 * 
 * Usage: @Roles('ADMIN')
 */
export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
