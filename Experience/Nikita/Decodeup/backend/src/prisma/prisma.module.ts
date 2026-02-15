import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * PrismaModule handles the database connection.
 * It is marked as @Global() so that PrismaService can be used in any other module
 * without needing to import PrismaModule every time.
 */
@Global()
@Module({
    providers: [PrismaService],
    exports: [PrismaService], // Export PrismaService for dependency injection
})
export class PrismaModule { }
