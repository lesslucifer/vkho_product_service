import { Block } from "src/blocks/entities/block.entity";
import { parseDate } from "src/common/partDateTime";
import { ParentProductCategory } from "src/parent-product-categorys/entities/parent-product-category.entity";
import { ProductCategory } from "src/product-categorys/entities/product-category.entity";
import { Rack } from "src/racks/entities/rack.entity";
import { AfterInsert, BeforeInsert, Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { ShelfStatus } from "../enum/shelf-status.enum";

@Entity()
export class Shelf {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        nullable: true,
    })
    code: string;

    @Column()
    name: string;

    @Column({
        nullable: true,
    })
    totalRack: number;

    @Column({
        nullable: true,
    })
    position: number;

    @Column({
        nullable: true,
    })
    medium: number;

    @Column({
        nullable: true,
    })
    high: number;

    @Column()
    capacity: number;

    @Column()
    status: string;

    @Column()
    warehouseId: number;

    @Column()
    createDate: Date;

    @ManyToOne(() => Block, block => block.shelfs)
    block: Block;

    @ManyToOne(() => ParentProductCategory)
    parentProductCategory: ParentProductCategory;

    @OneToMany(() => Rack, rack => rack.shelf)
    racks: Rack[];

    @BeforeInsert()
    private beforeInsert() {
        this.createDate = parseDate(new Date());
        this.status = ShelfStatus.ENABLE;
    }
}
