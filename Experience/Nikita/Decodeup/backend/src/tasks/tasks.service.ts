import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';

@Injectable()
export class TasksService {
    constructor(private prisma: PrismaService) { }

    async create(userId: number, dto: CreateTaskDto) {
        return this.prisma.task.create({
            data: {
                ...dto,
                userId,
            },
        });
    }

    async findAll(userId: number) {
        return this.prisma.task.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(userId: number, id: number) {
        const task = await this.prisma.task.findUnique({
            where: { id },
        });

        if (!task) throw new NotFoundException('Task not found');
        if (task.userId !== userId) throw new ForbiddenException('Access denied');

        return task;
    }

    async update(userId: number, id: number, dto: UpdateTaskDto) {
        await this.findOne(userId, id); // Check if exists and belongs to user
        return this.prisma.task.update({
            where: { id },
            data: dto,
        });
    }

    async remove(userId: number, id: number) {
        await this.findOne(userId, id); // Check if exists and belongs to user
        return this.prisma.task.delete({
            where: { id },
        });
    }
}
