import { PartialType } from '@nestjs/mapped-types';
import { CreateProductHistoryDto } from './create-product-history.dto';

export class UpdateProductHistoryDto extends PartialType(CreateProductHistoryDto) {
  id: number;
}
