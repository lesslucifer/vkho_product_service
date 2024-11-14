import { ProductCategory } from "src/product-categorys/entities/product-category.entity";
import { RackStatus } from "src/racks/enum/rack.enum";
import { Shelf } from "src/shelves/entities/shelf.entity";
import { Rack } from "../entities/rack.entity";


export class CreateRackDto {
  code: string;
  createDate: Date;
  capacity: number;
  usedCapacity: number;
  parentProductCategoryId: number;
  shelfId: number;
  shelfName: string;
  stt: number;
  blockCode: string;
  status: RackStatus;
  warehouseId: number;
  shelf: Shelf;
}
