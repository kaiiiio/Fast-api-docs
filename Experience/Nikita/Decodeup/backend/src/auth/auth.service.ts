import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

/**
 * AuthService handles the business logic for Authentication.
 * It uses the UsersService for DB access and JwtService for token generation.
 */
@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
    ) { }

    /**
     * Registers a new user.
     * Hashes the password using bcrypt before saving.
     */
    async register(email: string, pass: string, name?: string) {
        // Check if the user already exists in the database
        const existingUser = await this.usersService.findOneByEmail(email);
        if (existingUser) {
            throw new ConflictException('Email already exists');
        }

        // Hash the raw password (10 salt rounds is standard practice)
        const hashedPassword = await bcrypt.hash(pass, 10);
        const user = await this.usersService.create({
            email,
            password: hashedPassword,
            name,
        });

        // Remove password from the returned object for security
        const { password, ...result } = user;
        return result;
    }

    /**
     * Validates user credentials and returns a JWT token.
     */
    async login(email: string, pass: string) {
        const user = await this.usersService.findOneByEmail(email);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Compare the plain text password with the hashed one in the database
        const isMatch = await bcrypt.compare(pass, user.password);
        if (!isMatch) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Create JWT payload (sub is conventional for subject/id)
        const payload = { sub: user.id, email: user.email };
        return {
            access_token: await this.jwtService.signAsync(payload),
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
            },
        };
    }
}
