import { MasterProduct } from "src/master-products/entities/master-product.entity";
import { ProductCategory } from "src/product-categorys/entities/product-category.entity";
import { BeforeInsert, Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ReportMonth } from "../enums/report-month.enum";
import { ReportStatus } from "../enums/report-status.enum";
import { ReportType } from "../enums/report-type.enum";

@Entity()
export class Report {
    
    @PrimaryGeneratedColumn()
    id: number;

    @Column({nullable: true})
    valueProduct: number;

    @Column({nullable: true})
    valueCategory: number;

    @Column({nullable: true})
    month: number;

    @Column({nullable: true})
    year: number;

    @Column({nullable: true})
    typeName: string;

    @Column()
    status: ReportStatus;

    @Column()
    reportType: ReportType;

    @Column({nullable: true, readonly: false})
    warehouseId: number;

    @ManyToOne(() => ProductCategory)
    productCategory: ProductCategory;

    @ManyToOne(() => MasterProduct, masterProduct => masterProduct.reports)
    masterProduct: MasterProduct;

    @BeforeInsert()
    private beforeInsert() {
        this.status = ReportStatus.ENABLE;
    }

}