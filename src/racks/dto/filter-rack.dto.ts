import { PaginationDto } from "src/common/pagination.dto";

export class RackFilter extends PaginationDto {
  rackCode: string;
}