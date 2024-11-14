import { PaginationDto } from "src/common/pagination.dto";

export class ShelfFilter extends PaginationDto {
    shelfName: string;
    ids: string;
    parentProductCategoryId: number;
}