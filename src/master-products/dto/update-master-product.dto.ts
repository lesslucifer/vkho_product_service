import { PartialType } from '@nestjs/mapped-types';
import { ProductCategory } from 'src/product-categorys/entities/product-category.entity';
import { Supplier } from 'src/suppliers/entities/supplier.entity';
import { MasterProductStatus } from '../enums/master-product-status.enum';
import { CreateMasterProductDto } from './create-master-product.dto';

export class UpdateMasterProductDto extends PartialType(CreateMasterProductDto) {
  id: number;
  status: MasterProductStatus;
  suppliers: Supplier[];
  productCategory: ProductCategory;
}
