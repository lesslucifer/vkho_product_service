import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsArray, ValidateNested, Min, IsPositive, ArrayMinSize, IsInt, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { BomStatus } from '../enum/bom-status.enum';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBomComponentDto {
  @ApiProperty({ description: 'Master product ID' })
  @IsNumber()
  @IsInt()
  @IsPositive()
  @IsNotEmpty({ message: 'Master product ID is required' })
  masterProductId: number;

  @ApiProperty({ description: 'Required quantity' })
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

export class CreateBomDto {
  @ApiProperty({ description: 'Warehouse ID' })
  @IsNumber()
  @IsInt()
  @IsPositive()
  @IsNotEmpty({ message: 'Warehouse ID is required' })
  warehouseId: number;

  @ApiProperty({ description: 'BOM name' })
  @IsString()
  @IsNotEmpty({ message: 'BOM name is required' })
  name: string;

  @ApiProperty({ 
    description: 'BOM status', 
    enum: BomStatus, 
    default: BomStatus.ACTIVE,
    example: BomStatus.ACTIVE 
  })
  @IsEnum(BomStatus, { 
    message: `Status must be one of: ${Object.values(BomStatus).join(', ')}` 
  })
  @IsNotEmpty({ message: 'BOM status is required' })
  status: BomStatus;

  @ApiProperty({ description: 'List of components', type: [CreateBomComponentDto] })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one component is required' })
  @ValidateNested({ each: true })
  @Type(() => CreateBomComponentDto)
  bomComponents: CreateBomComponentDto[];
} 