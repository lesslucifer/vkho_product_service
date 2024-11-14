export class PaginationDto {
  page: number
  limit: number
  startDate: Date;
  endDate: Date;
  sortBy: string;
  sortDirection: string;
  warehouseId: number;
}