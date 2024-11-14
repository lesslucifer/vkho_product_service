import { PartialType } from '@nestjs/mapped-types';
import { ProductCategory } from 'src/product-categorys/entities/product-category.entity';
import { SupplierStatus } from '../enums/supplier-status.enum';
import { CreateSupplierDto } from './create-supplier.dto';

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {
  id: number;
  updateDate: Date;
  status: SupplierStatus;
  productCategorys: ProductCategory[];
}
