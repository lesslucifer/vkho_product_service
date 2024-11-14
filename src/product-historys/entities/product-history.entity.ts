import { ProductStatus } from "src/product/enum/product-status.enum";
import { AfterInsert, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class ProductHistory {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        nullable: true,
    })
    code: string;

    @Column()
    name: string;

    @Column()
    totalQuantity: number;

    @Column()
    cost: number;

    @Column()
    salePrice: number;

    @Column()
    status: ProductStatus;

    @Column()
    warehouseId: number;

    @Column()
    inboundKind: string;

    @Column()
    expireDate: Date;

    @Column()
    productCode: string;

    @Column()
    createDate: Date;

    @Column()
    blockId: number;

    @Column()
    supplierId: number;

    @Column()
    productCategoryId: number;
  
    @Column()
    rackId: number;
    
}
