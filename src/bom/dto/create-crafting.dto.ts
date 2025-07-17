import { IsNumber, IsPositive, Min, IsEnum, IsOptional, IsString } from 'class-validator';
import { CraftingStatus } from '../enums/crafting-status.enum';

export class CreateCraftingDto {
  @IsNumber()
  bomId: number;

  @IsNumber()
  @IsPositive()
  @Min(1)
  quantity: number;

  @IsEnum(CraftingStatus)
  @IsOptional()
  status?: CraftingStatus;

  @IsString()
  @IsOptional()
  notes?: string;
} 