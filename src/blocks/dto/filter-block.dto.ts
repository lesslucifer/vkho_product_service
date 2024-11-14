import { PaginationDto } from "src/common/pagination.dto";

export class BlockFilter extends PaginationDto {
  blockName: string;
  userId: string;
}