import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
    constructor(private readonly tasksService: TasksService) { }

    @Post()
    @ApiOperation({ summary: 'Create a new task' })
    create(@Request() req, @Body() createTaskDto: CreateTaskDto) {
        return this.tasksService.create(req.user.id, createTaskDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all user tasks' })
    findAll(@Request() req) {
        return this.tasksService.findAll(req.user.id);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a specific task' })
    findOne(@Request() req, @Param('id', ParseIntPipe) id: number) {
        return this.tasksService.findOne(req.user.id, id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a task' })
    update(@Request() req, @Param('id', ParseIntPipe) id: number, @Body() updateTaskDto: UpdateTaskDto) {
        return this.tasksService.update(req.user.id, id, updateTaskDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a task' })
    remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
        return this.tasksService.remove(req.user.id, id);
    }
}
