import { IsNumber, IsPositive, Min, IsEnum, IsOptional, IsString } from 'class-validator';
import { CraftingStatus } from '../enums/crafting-status.enum';

export class UpsertCraftingDto {
  @IsNumber()
  @IsOptional()
  id?: number; // If provided, update existing; if not, create new

  @IsNumber()
  @IsOptional() // Only required for create operation
  bomId?: number;

  @IsNumber()
  @IsPositive()
  @Min(1)
  @IsOptional() // Only required for create operation
  quantity?: number;

  @IsEnum(CraftingStatus)
  @IsOptional()
  status?: CraftingStatus;

  @IsString()
  @IsOptional()
  notes?: string;
} 