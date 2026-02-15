import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';

/**
 * TasksService handles business logic for Task CRUD.
 * It enforces user ownership, ensuring users can only manage their own tasks.
 */
@Injectable()
export class TasksService {
    constructor(private prisma: PrismaService) { }

    // Create a task linked to the userId
    async create(userId: number, dto: CreateTaskDto) {
        return this.prisma.task.create({
            data: {
                ...dto,
                userId,
            },
        });
    }

    // Get all tasks for a specific user
    async findAll(userId: number) {
        return this.prisma.task.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }, // Newest first
        });
    }

    /**
     * Find a specific task and verify ownership.
     * Throws 404 if not found or 403 if it belongs to someone else.
     */
    async findOne(userId: number, id: number) {
        const task = await this.prisma.task.findUnique({
            where: { id },
        });

        if (!task) throw new NotFoundException('Task not found');
        if (task.userId !== userId) throw new ForbiddenException('Access denied');

        return task;
    }

    // Update task after ensuring ownership
    async update(userId: number, id: number, dto: UpdateTaskDto) {
        await this.findOne(userId, id);
        return this.prisma.task.update({
            where: { id },
            data: dto,
        });
    }

    // Delete task after ensuring ownership
    async remove(userId: number, id: number) {
        await this.findOne(userId, id);
        return this.prisma.task.delete({
            where: { id },
        });
    }
}
