import { PartialType } from '@nestjs/mapped-types';
import { Block } from 'src/blocks/entities/block.entity';
import { ParentProductCategory } from 'src/parent-product-categorys/entities/parent-product-category.entity';
import { ProductCategory } from 'src/product-categorys/entities/product-category.entity';
import { ShelfStatus } from '../enum/shelf-status.enum';
import { CreateShelfDto } from './create-shelf.dto';

export class UpdateShelfDto extends PartialType(CreateShelfDto) {
  id: number;
  status: string;
  block: Block;
  parentProductCategory: ParentProductCategory;
}
