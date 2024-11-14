import { MasterProduct } from "src/master-products/entities/master-product.entity";
import { ProductCategory } from "src/product-categorys/entities/product-category.entity";
import { ReportMonth } from "../enums/report-month.enum";
import { ReportStatus } from "../enums/report-status.enum";
import { ReportType } from "../enums/report-type.enum";


export class ReportDTO {

    id: number;
    valueProduct: number;
    valueCategory: number;
    month: number;
    year: number;
    typeName: string;
    reportType: ReportType;
    status: ReportStatus;
    productCategory: ProductCategory;
    masterProduct: MasterProduct;
    warehouseId: number;
}