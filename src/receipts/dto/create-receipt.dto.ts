import { CreateProductDto } from "src/product/dto/create-product.dto";

export class CreateReceiptDto {
    creatorId : string;
    creatorName : string;
    driverName: string;
    boothCode: string;
    receiptDate: Date;
    description : string;
    warehouseId : number;
    supplierId: number;
    products: CreateProductDto[];
}
