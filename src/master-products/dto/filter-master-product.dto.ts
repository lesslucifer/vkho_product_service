import { PaginationDto } from "src/common/pagination.dto";
import { MasterProductStatus } from "../enums/master-product-status.enum";

export class MasterProductFilter extends PaginationDto {
  masterProductName: string;
  masterProductCode: string;
  productCategoryId: number;
  barCodes: string;
  barCode: string;
  supplierId: number;
  status: MasterProductStatus;
  isNoneReplenishment: boolean;
}