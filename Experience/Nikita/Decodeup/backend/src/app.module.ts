import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TasksModule } from './tasks/tasks.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
    imports: [
        PrismaModule,
        AuthModule,
        UsersModule,
        TasksModule,
    ],
})
export class AppModule { }
