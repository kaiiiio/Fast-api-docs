import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, User } from '@prisma/client';

/**
 * UsersService handles database operations related to the User model.
 * It is used by both the AuthService (for registration) and the TasksService (for ownership).
 */
@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    // Create a new user record in the database
    async create(data: Prisma.UserCreateInput): Promise<User> {
        return this.prisma.user.create({ data });
    }

    // Find a user by their unique email address
    async findOneByEmail(email: string): Promise<User | null> {
        return this.prisma.user.findUnique({ where: { email } });
    }

    // Find a user by their primary key ID
    async findOneById(id: number): Promise<User | null> {
        return this.prisma.user.findUnique({ where: { id } });
    }
}
