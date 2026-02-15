import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';

/**
 * AuthModule orchestrates authentication logic.
 * It configures Passport and JWT, and wires up the AuthController and AuthService.
 */
@Module({
    imports: [
        UsersModule, // Needed to find users during login/validation
        PassportModule, // Standard NestJS authentication library
        JwtModule.register({
            secret: process.env.JWT_SECRET || 'secretKey', // Signing key for JWTs
            signOptions: { expiresIn: '1h' }, // Tokens expire after 1 hour
        }),
    ],
    providers: [AuthService, JwtStrategy], // JwtStrategy validates the tokens
    controllers: [AuthController],
})
export class AuthModule { }
