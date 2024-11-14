import { ProductCategory } from "src/product-categorys/entities/product-category.entity";
import { Product } from "src/product/entities/product.entity";
import { Shelf } from "src/shelves/entities/shelf.entity";

export class RackDTO {
  id: number;
  code: string;
  createDate: Date;
  status: string;
  capacity: number;
  usedCapacity: number;
  warehouseId: number;
  products: Product[];
  productCategory: ProductCategory;
  qrcode: string;
  barcode: string;
} 