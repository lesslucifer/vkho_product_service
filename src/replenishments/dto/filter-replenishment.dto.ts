import { PaginationDto } from "src/common/pagination.dto";
import { ReplenishmentStatus } from "../enums/replenishment-status.enum";

export class ReplenishmentFilter extends PaginationDto {
  productCategoryId: number;
  masterProductId: number;
  productName: string;
  status: ReplenishmentStatus;
}