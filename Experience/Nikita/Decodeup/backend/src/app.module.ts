import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TasksModule } from './tasks/tasks.module';
import { PrismaModule } from './prisma/prisma.module';

/**
 * Root Module of the application.
 * It imports all the functional modules required for the app to work.
 */
@Module({
    imports: [
        PrismaModule, // Shared module for Database connection (Prisma)
        AuthModule,   // Handles Registration and Login
        UsersModule,  // Handles User data retrieval
        TasksModule,  // Handles Task CRUD operations
    ],
})
export class AppModule { }
