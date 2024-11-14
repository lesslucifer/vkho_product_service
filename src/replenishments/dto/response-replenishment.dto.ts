import { MasterProduct } from "src/master-products/entities/master-product.entity";
import { ProductCategory } from "src/product-categorys/entities/product-category.entity";

export class ReplenishmentDTO {

    id: number;
    productName: string;
    min: number;
    max: number;
    totalInventory: number;
    totalReplenishment: number;
    booking: number;
    onHand: number;
    toOrder: number;
    status: string;
    warehouseId: number;
    createDate: Date;
    productCategory: ProductCategory;
    masterProduct: MasterProduct;
}