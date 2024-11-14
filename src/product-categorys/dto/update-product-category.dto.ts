import { PartialType } from '@nestjs/mapped-types';
import { ParentProductCategory } from 'src/parent-product-categorys/entities/parent-product-category.entity';
import { ReceiptStatus } from 'src/receipts/enums/receipt-status.enum';
import { ProductCategoryStatus } from '../enums/product-category-status.enum';
import { CreateProductCategoryDto } from './create-product-category.dto';

export class UpdateProductCategoryDto extends PartialType(CreateProductCategoryDto) {
  updateDate: Date;
  id: number;
  status: ProductCategoryStatus;
  parentProductCategory: ParentProductCategory;
}
