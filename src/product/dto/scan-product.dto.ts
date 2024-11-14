import { PaginationDto } from "src/common/pagination.dto";

export class ScanProduct extends PaginationDto {
    productCodes: string[];
    type: string;    
    packageCodes: string[];
    barCodes: string[];
    rackCode: string;
}