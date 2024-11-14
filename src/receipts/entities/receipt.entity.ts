import { parseDate } from "src/common/partDateTime";
import { Product } from "src/product/entities/product.entity";
import { Supplier } from "src/suppliers/entities/supplier.entity";
import { AfterInsert, BeforeInsert, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { InboundKindStatus } from "../enums/inbound-kind-status.enum";
import { ReceiptStatus } from "../enums/receipt-status.enum";

@Entity()
export class Receipt {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        nullable: true,
    })
    code: string;

    @Column({ nullable: true })
    boothCode: string;

    @Column({
        nullable: true,
    })
    creatorId: string;

    @Column({
        nullable: true,
    })
    creatorName: string;

    @Column({
        nullable: true,
    })
    driverName: string;

    @Column()
    createDate: Date;

    @Column()
    receiptDate: Date;

    @Column({
        nullable: true,
    })
    description: string;

    @Column()
    warehouseId: number;

    @Column({ enum: ReceiptStatus, nullable: true })
    status: string;

    @Column({ enum: InboundKindStatus, nullable: true })
    inboundkind: string;

    @ManyToOne(() => Supplier, supplier => supplier.receipts)
    supplier: Supplier;

    @OneToMany(() => Product, product => product.receipt)
    products: Product[];

    @BeforeInsert()
    private beforeInsert() {
        this.createDate = parseDate(new Date());
        this.status = ReceiptStatus.NEW;
    }
}
