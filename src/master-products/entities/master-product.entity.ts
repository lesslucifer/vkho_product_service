import { parseDate } from "src/common/partDateTime";
import { ProductCategory } from "src/product-categorys/entities/product-category.entity";
import { Product } from "src/product/entities/product.entity";
import { Replenishment } from "src/replenishments/entities/replenishment.entity";
import { Report } from "src/reports/entities/report.entity";
import { Supplier } from "src/suppliers/entities/supplier.entity";
import { AfterInsert, BeforeInsert, Column, Entity, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { MasterProductMethod } from "../enums/master-product-method";
import { MasterProductStatus } from "../enums/master-product-status.enum";

@Entity()
export class MasterProduct {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        nullable: true,
    })
    code: string;

    @Column()
    name: string;

    @Column()
    capacity: number;

    @Column({
        nullable: true,
    })
    stogareTime: number;

    @Column()
    createDate: Date;

    @Column({
        enum: MasterProductMethod, nullable: true
    })
    method: MasterProductMethod;

    @Column({ enum: MasterProductStatus, nullable: true })
    status: MasterProductStatus;

    @Column({
        nullable: true,
    })
    image: string;

    @Column()
    warehouseId: number;

    // @OneToMany(() => Supplier, suppliers => suppliers.masterProduct)
    // suppliers: Supplier[];

    @ManyToMany(() => Supplier)
    @JoinTable()
    suppliers: Supplier[];

    @ManyToOne(() => ProductCategory, productCategory => productCategory.masterProducts)
    productCategory: ProductCategory;

    @OneToMany(() => Product, products => products)
    products: Product[];

    @OneToMany(() => Replenishment, replenishments => replenishments.masterProduct)
    replenishments: Replenishment[];

    @OneToMany(() => Report, reports => reports)
    reports: Report[];

    @Column({
        nullable: true,
    })
    purchasePrice: number;

    @Column({
        nullable: true,
    })
    salePrice: number;

    @Column({
        nullable: true,
    })
    retailPrice: number;

    @Column({
        nullable: true,
    })
    VAT: number;

    @Column({
        nullable: true,
    })
    barCode: string;

    @Column({
        nullable: true,
    })
    DVT: string;

    @Column()
    packing: string;

    @Column({
        nullable: true,
    })
    length: number;
  
    @Column({
        nullable: true,
    })
    width: number;
  
    @Column({
        nullable: true,
    })
    height: number;

    @Column({
        nullable: true,
    })
    itemCode: string;

    @Column({ nullable: true })
    isActive: boolean;

    @Column({
        nullable: true,
    })
    discount: number;

    @Column({
        nullable: true,
        default: false
    })
    isResources: boolean;

    @Column({ nullable: true })
    description: string;

    @Column({
        nullable: true,
        default: 0
    })
    availableQuantity: number;

    @BeforeInsert()
    private beforeInsert() {
        this.createDate = parseDate(new Date());
        this.status = MasterProductStatus.ENABLE;
    }
}
