import { Receipt } from "src/receipts/entities/receipt.entity";
import { ProductStatus } from "../enum/product-status.enum";

export class CreateProductDto {
  name: string;
  totalQuantity: number;
  expectedQuantity: number;
  cost: number;
  salePrice: number;
  warehouseId: number;
  inboundKind: string;
  expireDate: Date;
  storageDate: Date;
  productCode: string;
  idRackReallocate: number;
  imageProduct: string;
  imageQRCode: string;
  imageBarcode: string;
  code: string;
  note: string;
  barCode: string;
  blockId: number;
  rackId: number;
  rackCode: string;
  receiptId: number;
  supplierId: number;
  zoneId: number;
  orderId: number;
  packageId: number;
  masterProductId: number;
  productCategoryId: number;
  status1: string;

  receipt: Receipt;
}
