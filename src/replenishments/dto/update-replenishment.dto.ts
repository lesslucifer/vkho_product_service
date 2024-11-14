import { PartialType } from '@nestjs/mapped-types';
import { MasterProduct } from 'src/master-products/entities/master-product.entity';
import { ProductCategory } from 'src/product-categorys/entities/product-category.entity';
import { ReplenishmentStatus } from '../enums/replenishment-status.enum';
import { CreateReplenishmentDto } from './create-replenishment.dto';

export class UpdateReplenishmentDto extends PartialType(CreateReplenishmentDto) {
  id: number;
  status: ReplenishmentStatus;
  productCategory: ProductCategory;
  masterProduct: MasterProduct;
}
