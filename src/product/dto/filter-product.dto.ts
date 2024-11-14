import { PaginationDto } from "src/common/pagination.dto";
import { ProductStatus } from "../enum/product-status.enum";

export class ProductFilter extends PaginationDto {
  keyword: string;
  receiptId: number;
  orderId: number;
  blockId: number;
  masterProductId: number;
  masterProductCode: string;
  status: ProductStatus;
  packageCode: string;
  productCategoryId: number;
  supplierId: number;
  multipleStatus: string;
  rackId: number;
  rackCode: string;
  startLostDate: Date;
  endLostDate: Date;
  startReportDate: Date;
  endReportDate: Date;
  startStorageDate: Date;
  endStorageDate: Date;
  startExpireDate: Date;
  endExpireDate: Date;
  group: string;
}