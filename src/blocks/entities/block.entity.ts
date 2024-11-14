import { parseDate } from "src/common/partDateTime";
import { ProductHistory } from "src/product-historys/entities/product-history.entity";
import { Product } from "src/product/entities/product.entity";
import { Shelf } from "src/shelves/entities/shelf.entity";
import { AfterInsert, BeforeInsert, Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { BlockStatus } from "../enums/block-status.enum";

@Entity()
export class Block {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        nullable: true,
    })
    code: string;

    @Column({
        nullable: false,
    })
    name: string;

    @Column()
    createDate: Date;

    @Column({
        nullable: true,
    })
    totalShelf: number;

    @Column({
        nullable: true,
    })
    position: number;

    @Column({ enum: BlockStatus , nullable: true})
    status: string;

    @Column()
    warehouseId: number;

    @OneToMany(() => Product, product => product.block)
    products: Product[];

    @OneToMany(() => Shelf, shelf => shelf.block)
    shelfs: Shelf[];

    @Column("simple-array", {nullable: true})
    userIds: string[];

    @BeforeInsert()
    private beforeInsert() {
      this.createDate = parseDate(new Date());
      this.status = BlockStatus.ENABLE;
    }
    
}
