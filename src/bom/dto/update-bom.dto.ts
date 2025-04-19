import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsArray, ValidateNested, Min, IsPositive, ArrayMinSize, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { BomStatus } from '../enum/bom-status.enum';
import { ApiProperty } from '@nestjs/swagger';
import { UpdateBomComponentDto } from '../../bom-component/dto/update-bom-component.dto';

export class UpdateBomDto {
  
    @ApiProperty({ description: 'BOM ID' })
    @IsNumber()
    @IsInt()
    @IsPositive()
    @IsNotEmpty({ message: 'BOM ID is required' })
    id: number;
  
    @ApiProperty({ description: 'BOM status', enum: BomStatus })
    @IsEnum(BomStatus)
    @IsOptional()
    status?: BomStatus;
  
    @ApiProperty({ description: 'List of components', type: [UpdateBomComponentDto] })
    @IsArray()
    @ArrayMinSize(1, { message: 'At least one component is required' })
    @ValidateNested({ each: true })
    @Type(() => UpdateBomComponentDto)
    @IsOptional()
    components?: UpdateBomComponentDto[];
  } 