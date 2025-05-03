import { ProductCategory } from "src/product-categorys/entities/product-category.entity";

export class CreateSupplierDto {
    name: string;
    email: string;
    phoneNumber: string;
    isActive: boolean;
    contractNumber: string;
    taxCode: string;
    address: string;
    cooperationDay: string | Date;
    warehouseId: number;
    productCategoryIds: number[];
    productCategorys: ProductCategory[];
}
