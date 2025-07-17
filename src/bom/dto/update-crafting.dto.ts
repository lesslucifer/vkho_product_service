import { IsNumber, IsEnum, IsOptional, IsString } from 'class-validator';
import { CraftingStatus } from '../enums/crafting-status.enum';

export class UpdateCraftingDto {
  @IsNumber()
  id: number;

  @IsEnum(CraftingStatus)
  @IsOptional()
  status?: CraftingStatus;

  @IsString()
  @IsOptional()
  notes?: string;
} 