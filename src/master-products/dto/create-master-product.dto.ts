import { CreateProductDto } from "src/product/dto/create-product.dto";
import { MasterProductMethod } from "../enums/master-product-method";

export class CreateMasterProductDto {
    name: string;
    code: string;
    method: MasterProductMethod;
    capacity: number;
    stogareTime: number;
    image: string;
    warehouseId: number;
    supplierIds: number[];
    productCategoryId: number;
    purchasePrice: number;
    salePrice: number;
    retailPrice: number;
    VAT: number;
    DVT: string;
    barCode: string;
    packing: string;
    length: number;
    width: number;
    height: number;
    itemCode: string;
    isActive: boolean;
    discount: number;
    isResources: boolean;
    description: string;
}
