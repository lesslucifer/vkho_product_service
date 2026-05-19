export class CreateApiAuditLogDto {
  warehouseId: number;
  userId?: string | null;
  user: string;
  method: string;
  endpoint: string;
  statusCode?: number | null;
}
