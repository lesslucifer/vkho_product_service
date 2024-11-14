import { PaginationDto } from "src/common/pagination.dto";
import { ProductCategoryStatus } from "../enums/product-category-status.enum";

export class ProductCategoryFilter extends PaginationDto {
  productCategoryName: string;
  status : ProductCategoryStatus;
}