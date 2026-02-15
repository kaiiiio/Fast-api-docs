import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';

/**
 * TasksModule handles all task-related logic.
 * It depends on the global PrismaModule for DB access.
 */
@Module({
    controllers: [TasksController],
    providers: [TasksService],
})
export class TasksModule { }
