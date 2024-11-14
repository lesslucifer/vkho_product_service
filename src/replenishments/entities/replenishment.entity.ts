import { parseDate } from "src/common/partDateTime";
import { MasterProduct } from "src/master-products/entities/master-product.entity";
import { ProductCategory } from "src/product-categorys/entities/product-category.entity";
import { BeforeInsert, Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ReplenishmentStatus } from "../enums/replenishment-status.enum";

@Entity()
export class Replenishment {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    productName: string;

    @Column()
    min: number;

    @Column()
    max: number;

    @Column({
        nullable: true,
    })
    totalInventory: number;

    @Column({
        nullable: true,
    })
    totalReplenishment: number;

    @Column()
    status: string;

    @Column()
    warehouseId: number;

    @Column()
    createDate: Date;

    @ManyToOne(() => ProductCategory)
    productCategory: ProductCategory;

    @ManyToOne(() => MasterProduct, masterProduct => masterProduct.replenishments)
    masterProduct: MasterProduct;

    @BeforeInsert()
    private beforeInsert() {
        this.createDate = parseDate(new Date());
        this.status = ReplenishmentStatus.ENABLE;
    }
}
