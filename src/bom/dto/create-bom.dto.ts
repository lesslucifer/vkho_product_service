import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsArray, ValidateNested, Min, IsPositive, ArrayMinSize, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { BomStatus } from '../enum/bom-status.enum';
import { ApiProperty } from '@nestjs/swagger';
import { CreateBomComponentDto } from '../../bom-component/dto/create-bom-component.dto';

export class CreateBomDto {
    @ApiProperty({ description: 'Master product ID' })
    @IsNumber()
    @IsInt()
    @IsPositive()
    @IsNotEmpty({ message: 'Master product ID is required' })
    masterProductId: number;
  
    @ApiProperty({ description: 'Warehouse ID' })
    @IsNumber()
    @IsInt()
    @IsPositive()
    @IsNotEmpty({ message: 'Warehouse ID is required' })
    warehouseId: number;
  
    @ApiProperty({ description: 'BOM status', enum: BomStatus, default: BomStatus.ACTIVE })
    @IsEnum(BomStatus)
    @IsOptional()
    status?: BomStatus;
  
    @ApiProperty({ description: 'List of components', type: [CreateBomComponentDto] })
    @IsArray()
    @ArrayMinSize(1, { message: 'At least one component is required' })
    @ValidateNested({ each: true })
    @Type(() => CreateBomComponentDto)
    components: CreateBomComponentDto[];
  } 