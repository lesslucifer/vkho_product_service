export class CreateProductHistoryDto {
  name: string;
  totalQuantity: number;
  cost: number;
  salePrice: number;
  warehouseId: number;
  inboundKind: string;
  expireDate: Date;
  productCode: string;
  blockId: number;
  supplierId: number;
  productCategoryId: number;
  rackId: number;
}
