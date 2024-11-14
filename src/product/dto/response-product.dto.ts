import { Block } from "src/blocks/entities/block.entity";
import { MasterProduct } from "src/master-products/entities/master-product.entity";
import { Rack } from "src/racks/entities/rack.entity";
import { Receipt } from "src/receipts/entities/receipt.entity";
import { Zone } from "src/zone/entities/zone.entity";

export class ProductDTO {
    id: number;
    code: string;
    name: string;
    totalQuantity: number;
    importDate: Date;
    description: string;
    cost: number;
    salePrice: number;
    status: string;
    warehouseId: number
    inboundKind: string;
    expireDate: Date;
    productCode: string;
    idRackReallocate: number;
    imageProduct: string;
    imageQRCode: string;
    imageBarcode: string;
    rack: Rack;
    receipt: Receipt;
    zone: Zone;
    masterProduct: MasterProduct;
    block: Block;
    packageId: number;
    orderId: number;
    note: string;
}

export class ProductScanResponse {
    successList: ProductDTO[]; 
    errList: string[];
    rack: Rack;
}