import { Module } from '@nestjs/common';
import { UsersService } from './users.service';

/**
 * UsersModule manages User data.
 * It provides UsersService to other modules (like AuthModule).
 */
@Module({
    providers: [UsersService],
    exports: [UsersService], // Allow other modules to inject UsersService
})
export class UsersModule { }
