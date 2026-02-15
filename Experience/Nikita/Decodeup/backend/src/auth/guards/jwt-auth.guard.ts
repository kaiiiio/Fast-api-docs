import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JwtAuthGuard is a convenience wrapper for NestJS AuthGuard.
 * Applying '@UseGuards(JwtAuthGuard)' to a controller or method 
 * will require a valid JWT to access the route.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') { }
