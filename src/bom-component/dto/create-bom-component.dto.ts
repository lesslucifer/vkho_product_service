import { IsNumber, IsOptional, IsInt, IsPositive, Min, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBomComponentDto {
    @ApiProperty({ description: 'Component product ID' })
    @IsNumber()
    @IsInt()
    @IsPositive()
    @IsNotEmpty({ message: 'Component product ID is required' })
    productId: number;
  
    @ApiProperty({ description: 'Required quantity of the component' })
    @IsNumber()
    @IsInt()
    @IsPositive()
    @Min(1, { message: 'Component quantity must be greater than 0' })
    @IsNotEmpty({ message: 'Component quantity is required' })
    quantity: number;

    @ApiProperty({ description: 'Unit of measurement', required: false })
    @IsString()
    @IsOptional()
    unit?: string;

    @ApiProperty({ description: 'Color specification', required: false })
    @IsString()
    @IsOptional()
    color?: string;

    @ApiProperty({ description: 'Drawer location', required: false })
    @IsString()
    @IsOptional()
    drawers?: string;

    @ApiProperty({ description: 'Additional notes', required: false })
    @IsString()
    @IsOptional()
    notes?: string;
}