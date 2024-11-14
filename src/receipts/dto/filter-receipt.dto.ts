import { PaginationDto } from "src/common/pagination.dto";
import { ReceiptStatus } from "../enums/receipt-status.enum";

export class ReceiptFilter extends PaginationDto {
  keyword: string;
  status: ReceiptStatus;
}