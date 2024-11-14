import { PartialType } from '@nestjs/mapped-types';
import { Block } from 'src/blocks/entities/block.entity';
import { ParentProductCategory } from 'src/parent-product-categorys/entities/parent-product-category.entity';
import { ProductCategory } from 'src/product-categorys/entities/product-category.entity';
import { VanStatus } from '../enum/van-status.enum';
import { CreateVanDto } from './create-van.dto';

export class UpdateVanDto extends PartialType(CreateVanDto) {
  id: number;
  status: string;
  block: Block;
  parentProductCategory: ParentProductCategory;
}
