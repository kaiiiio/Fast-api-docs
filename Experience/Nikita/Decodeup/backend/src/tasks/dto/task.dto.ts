import { IsNotEmpty, IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

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
    @IsIn(['PENDING', 'COMPLETED'])
    status?: string;
}

export class UpdateTaskDto extends PartialType(CreateTaskDto) { }
