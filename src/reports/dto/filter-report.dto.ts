import { PaginationDto } from "src/common/pagination.dto";
import { ReportStatus } from "../enums/report-status.enum";
import { ReportType } from "../enums/report-type.enum";

export class ReportFilter extends PaginationDto {
    productName: string;
    warehouseId: number;
    masterProductId: number;
    date: Date;
    status: ReportStatus;
    type: ReportType;
  }