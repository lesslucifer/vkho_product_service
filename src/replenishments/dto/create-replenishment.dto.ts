export class CreateReplenishmentDto {
  productName: string;
  min: number;
  max: number;
  warehouseId: number;
  productCategoryId: number;
  masterProductId: number;
}
