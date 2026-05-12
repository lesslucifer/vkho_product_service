import { PaginationDto } from 'src/common/pagination.dto';

export class ScanProduct extends PaginationDto {
  productCodes?: string[];
  type?: string;
  packageCodes?: string[];
  barCodes?: string[];
  rackCode?: string;
  /** Legacy single-code field from web clients */
  productCode?: string;
  location?: string;
  quantity?: number;
}
