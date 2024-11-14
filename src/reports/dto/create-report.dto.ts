import { MasterProduct } from "src/master-products/entities/master-product.entity";
import { ProductCategory } from "src/product-categorys/entities/product-category.entity";
import { ReportType } from "../enums/report-type.enum";

export class CreateReportDTO {
    valueProduct: number;
    valueCategory: number;
    month: number;
    year: number;
    typeName: string;
    reportType: ReportType;
    warehouseId: number;
    productCategory: ProductCategory;
    masterProduct: MasterProduct;
}