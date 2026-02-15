import { IsNotEmpty, IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

/**
 * Data Transfer Object (DTO) for creating a Task.
 */
export class CreateTaskDto {
    @ApiProperty({ example: 'Buy groceries' })
    @IsString()
    @IsNotEmpty()
    title: string;

    @ApiProperty({ example: 'Milk, Eggs, Bread', required: false })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ example: 'PENDING', enum: ['PENDING', 'COMPLETED'], default: 'PENDING' })
    @IsString()
    @IsOptional()
    @IsIn(['PENDING', 'COMPLETED']) // Restrict values to allowed statuses
    status?: string;
}

/**
 * Data Transfer Object (DTO) for updating a Task.
 * Inherits all properties from CreateTaskDto but makes them optional.
 */
export class UpdateTaskDto extends PartialType(CreateTaskDto) { }
