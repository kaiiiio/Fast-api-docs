import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService act as a wrapper around PrismaClient.
 * We use OnModuleInit and OnModuleDestroy to manage DB connections lifecycle automatically.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    // Connect to the database when the module initializes
    async onModuleInit() {
        await this.$connect();
    }

    // Gracefully disconnect from the database when the application shuts down
    async onModuleDestroy() {
        await this.$disconnect();
    }
}
