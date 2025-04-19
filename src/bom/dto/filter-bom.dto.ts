import { PaginationDto } from "src/common/pagination.dto";
import { BomStatus } from "../enum/bom-status.enum";

export class BomFilter extends PaginationDto {
  masterProductName: string;
  masterProductCode: string;
  productCategoryId: number;
  barCodes: string;
  barCode: string;
  supplierId: number;
  status: BomStatus;
  isNoneReplenishment: boolean;
}