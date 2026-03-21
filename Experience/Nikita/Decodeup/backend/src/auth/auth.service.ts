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

    async register(email: string, pass: string, name?: string, role?: string): Promise<any> {
        // Check if the user already exists in the database
        const existingUser = await this.usersService.findOneByEmail(email);
        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        const hashedPassword = await bcrypt.hash(pass, 10);
        const user = await this.usersService.create({
            email,
            password: hashedPassword,
            name,
            role: role ? (role as any) : 'USER',
        });

        // Remove password from the returned object for security
        const { password, ...result } = user;
        return result;
    }

    /**
     * User login: validates credentials and returns a JWT.
     */
    async login(email: string, pass: string): Promise<any> {
        const user = await this.usersService.findOneByEmail(email);

        // Compare the provided password with the hashed password in the DB
        if (!user || !(await bcrypt.compare(pass, user.password))) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Create JWT payload (sub is conventional for subject/id)
        const payload = { email: user.email, sub: user.id, role: user.role };
        return {
            access_token: await this.jwtService.signAsync(payload),
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
        };
    }
}
