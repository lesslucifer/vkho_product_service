import { PaginationDto } from "src/common/pagination.dto";
import { DivisonStatus } from "../enums/divison-status.enum";

export class DivisonFilter extends PaginationDto {
  divisonName: string;
  status : DivisonStatus;
}