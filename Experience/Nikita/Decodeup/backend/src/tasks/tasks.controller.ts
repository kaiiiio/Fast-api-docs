import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

/**
 * TasksController handles CRUD operations for user tasks.
 * Most routes are protected by JwtAuthGuard.
 */
@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard) // Protect all routes with JWT and check Roles
@Controller('tasks')
export class TasksController {
    constructor(private readonly tasksService: TasksService) { }

    // Create a new task (automatically associated with the logged-in user)
    @Post()
    @ApiOperation({ summary: 'Create a new task' })
    create(@Request() req, @Body() createTaskDto: CreateTaskDto) {
        // req.user is populated by the JwtStrategy from the token
        return this.tasksService.create(req.user.id, createTaskDto);
    }

    // Get all tasks for the logged-in user
    @Get()
    @Roles('USER', 'ADMIN') // Both users and admins can list tasks
    @ApiOperation({ summary: 'Get all tasks for current user' })
    findAll(@Request() req: any) {
        return this.tasksService.findAll(req.user.id);
    }

    // Get a single task by ID (validates ownership inside the service)
    @Get(':id')
    @ApiOperation({ summary: 'Get a specific task' })
    findOne(@Request() req, @Param('id') id: number) {
        return this.tasksService.findOne(req.user.id, id);
    }

    // Update a task (validates ownership)
    @Patch(':id')
    @ApiOperation({ summary: 'Update a task' })
    update(@Request() req, @Param('id') id: number, @Body() updateTaskDto: UpdateTaskDto) {
        return this.tasksService.update(req.user.id, id, updateTaskDto);
    }

    // Delete a task (validates ownership)
    @Delete(':id')
    @Roles('ADMIN') // Example: Only admins can delete tasks globally
    @ApiOperation({ summary: 'Delete a task' })
    remove(@Request() req: any, @Param('id') id: string) {
        return this.tasksService.remove(req.user.id, +id);
    }
}
