import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsArray, ValidateNested, Min, IsPositive, ArrayMinSize, IsInt, IsString, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { BomStatus } from '../enum/bom-status.enum';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBomComponentDto {
  @ApiProperty({ description: 'Component ID' })
  @IsNumber()
  @IsInt()
  @IsPositive()
  @IsNotEmpty({ message: 'Component ID is required' })
  id: number;

  @ApiProperty({ description: 'BOM ID' })
  @IsNumber()
  @IsInt()
  @IsPositive()
  @IsNotEmpty({ message: 'BOM ID is required' })
  bomId: number;

  @ApiProperty({ description: 'Master product ID' })
  @IsNumber()
  @IsInt()
  @IsPositive()
  @IsNotEmpty({ message: 'Master product ID is required' })
  masterProductId: number;

  @ApiProperty({ description: 'Required quantity' })
  @IsString()
  @IsNotEmpty({ message: 'Component quantity is required' })
  quantity: string;

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

  @ApiProperty({ description: 'Component creation date' })
  @IsDate()
  @IsNotEmpty({ message: 'Creation date is required' })
  createdAt: Date;

  @ApiProperty({ description: 'Component last update date' })
  @IsDate()
  @IsNotEmpty({ message: 'Update date is required' })
  updatedAt: Date;
}

export class UpdateBomWarehouseDto {
  @ApiProperty({ description: 'Warehouse ID' })
  @IsNumber()
  @IsInt()
  @IsPositive()
  @IsNotEmpty({ message: 'Warehouse ID is required' })
  id: number;

  @ApiProperty({ description: 'Warehouse name' })
  @IsString()
  @IsNotEmpty({ message: 'Warehouse name is required' })
  name: string;

  @ApiProperty({ description: 'Warehouse code' })
  @IsString()
  @IsNotEmpty({ message: 'Warehouse code is required' })
  code: string;

  @ApiProperty({ description: 'Warehouse address' })
  @IsString()
  @IsNotEmpty({ message: 'Warehouse address is required' })
  address: string;

  @ApiProperty({ description: 'Warehouse acreage' })
  @IsNumber()
  @IsInt()
  @IsPositive()
  @IsNotEmpty({ message: 'Warehouse acreage is required' })
  acreage: number;

  @ApiProperty({ description: 'Warehouse creation date' })
  @IsDate()
  @IsNotEmpty({ message: 'Warehouse creation date is required' })
  createDate: Date;

  @ApiProperty({ description: 'Warehouse status' })
  @IsString()
  @IsNotEmpty({ message: 'Warehouse status is required' })
  status: string;

  @ApiProperty({ description: 'Warehouse user IDs' })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ message: 'Warehouse user IDs are required' })
  userIds: string[];
}

export class UpdateBomDto {
  @ApiProperty({ description: 'BOM ID' })
  @IsNumber()
  @IsInt()
  @IsPositive()
  @IsNotEmpty({ message: 'BOM ID is required' })
  id: number;

  @ApiProperty({ 
    description: 'BOM status', 
    enum: BomStatus,
    example: BomStatus.ACTIVE
  })
  @IsEnum(BomStatus, { 
    message: `Status must be one of: ${Object.values(BomStatus).join(', ')}` 
  })
  @IsNotEmpty({ message: 'BOM status is required' })
  status: BomStatus;

  @ApiProperty({ description: 'BOM creation date' })
  @IsDate()
  @IsNotEmpty({ message: 'Creation date is required' })
  createdAt: Date;

  @ApiProperty({ description: 'BOM last update date' })
  @IsDate()
  @IsNotEmpty({ message: 'Update date is required' })
  updatedAt: Date;

  @ApiProperty({ description: 'BOM deletion date', required: false })
  @IsDate()
  @IsOptional()
  deletedAt?: Date;

  @ApiProperty({ description: 'List of components', type: [UpdateBomComponentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateBomComponentDto)
  @IsNotEmpty({ message: 'Components are required' })
  bomComponents: UpdateBomComponentDto[];

  @ApiProperty({ description: 'Warehouse details', type: UpdateBomWarehouseDto })
  @ValidateNested()
  @Type(() => UpdateBomWarehouseDto)
  @IsNotEmpty({ message: 'Warehouse details are required' })
  warehouse: UpdateBomWarehouseDto;
} 