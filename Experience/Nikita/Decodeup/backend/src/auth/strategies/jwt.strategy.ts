import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';

/**
 * JwtStrategy is used by Passport to validate JWT tokens in request headers.
 * It extracts the token, verifies the signature, and decodes the payload.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private usersService: UsersService) {
        super({
            // Extracts the token as a Bearer token from the Authorization header
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET || 'secretKey', // Must match the secret used in AuthModule
        });
    }

    /**
     * Called automatically after the token is successfully verified.
     * The 'payload' contains the data encoded in the token (e.g., sub/userId).
     */
    async validate(payload: any) {
        // Check if the user associated with the token still exists in the DB
        const user = await this.usersService.findOneById(payload.sub);
        if (!user) {
            throw new UnauthorizedException();
        }
        // Whatever is returned here is attached to the 'req.user' object in controllers
        return { id: user.id, email: user.email };
    }
}
