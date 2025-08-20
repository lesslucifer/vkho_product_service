import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsArray, ValidateNested, Min, IsPositive, ArrayMinSize, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { BomFinishedProductStatus } from '../enum/bom-finished-product-status.enum';
import { ApiProperty } from '@nestjs/swagger';
import { CreateBomFinishedProductDto } from './create-bom-finished-product.dto';

export class UpdateBomFinishedProductDto extends CreateBomFinishedProductDto {

    @ApiProperty({ description: 'Component ID' })
    @IsNumber()
    @IsInt()
    @IsPositive()
    @IsNotEmpty({ message: 'Component ID is required' })
    id: number;
    
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
}