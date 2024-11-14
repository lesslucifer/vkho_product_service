import { PaginationDto } from "src/common/pagination.dto";
import { SupplierStatus } from "../enums/supplier-status.enum";

export class SupplierFilter extends PaginationDto {
  supplierName: string;
  status: SupplierStatus;
  productCategoryId: number;
}