import { PaginationDto } from "src/common/pagination.dto";

export class FilterWarehouseDTO extends PaginationDto {
    userId: string;
    keyword: string;
}