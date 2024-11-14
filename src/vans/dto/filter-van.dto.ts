import { PaginationDto } from "src/common/pagination.dto";

export class VanFilter extends PaginationDto {
    shelfName: string;
    ids: string;
    parentProductCategoryId: number;
}