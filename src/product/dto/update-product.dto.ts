import { PartialType } from '@nestjs/mapped-types';
import { Block } from 'src/blocks/entities/block.entity';
import { MasterProduct } from 'src/master-products/entities/master-product.entity';
import { ProductCategory } from 'src/product-categorys/entities/product-category.entity';
import { Rack } from 'src/racks/entities/rack.entity';
import { Supplier } from 'src/suppliers/entities/supplier.entity';
import { Zone } from 'src/zone/entities/zone.entity';
import { ProductStatus } from '../enum/product-status.enum';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  id: number;
  reportDate: Date;
  status: ProductStatus;
  description: string;
  lostNumber: number;
  lostDate: Date;
  rack: Rack;
  zone: Zone;
  masterProduct: MasterProduct;
  block: Block;
  supplier: Supplier;
}
