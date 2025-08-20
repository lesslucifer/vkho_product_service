import { IsNumber, IsPositive, Min } from 'class-validator';

export class CraftFinishedProductDto {
  @IsNumber()
  bomId: number;

  @IsNumber()
  @IsPositive()
  @Min(1)
  quantity: number;
} 