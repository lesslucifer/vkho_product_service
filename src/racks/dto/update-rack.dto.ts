import { PartialType } from '@nestjs/mapped-types';
import { ParentProductCategory } from 'src/parent-product-categorys/entities/parent-product-category.entity';
import { ProductCategory } from 'src/product-categorys/entities/product-category.entity';
import { Shelf } from 'src/shelves/entities/shelf.entity';
import { RackStatus } from '../enum/rack.enum';
import { CreateRackDto } from './create-rack.dto';

export class UpdateRackDto extends PartialType(CreateRackDto) {
  id: number;
  status: RackStatus;
  parentProductCategory: ParentProductCategory;
  shelf: Shelf;
}
