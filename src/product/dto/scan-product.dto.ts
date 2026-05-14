import { PaginationDto } from 'src/common/pagination.dto';
import { ProductLocationLine } from './product-location.dto';

export class ScanProduct extends PaginationDto {
  productCodes?: string[];
  type?: string;
  packageCodes?: string[];
  barCodes?: string[];
  rackCode?: string;
  productCode?: string;
  location?: string;
  quantity?: number;
  locations?: ProductLocationLine[];
  blockRef?: string;
  shelfName?: string;
}
