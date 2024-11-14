import { PaginationDto } from "src/common/pagination.dto";

export class RecommendProduct extends PaginationDto {
    masterProductId: number;
    quantity: number;
}