import { PaginationDto } from "src/common/pagination.dto";
import { ParentProductCategoryStatus } from "../enums/parent-product-category-status.enum";

export class ParentProductCategoryFilter extends PaginationDto {
  parentProductCategoryName: string;
  status : ParentProductCategoryStatus;
}