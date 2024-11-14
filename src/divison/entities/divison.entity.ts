import { MasterProduct } from 'src/master-products/entities/master-product.entity';
import { ProductHistory } from 'src/product-historys/entities/product-history.entity';
import { Product } from 'src/product/entities/product.entity';
import { Rack } from 'src/racks/entities/rack.entity';
import { ProductCategory } from "src/product-categorys/entities/product-category.entity";
import { AfterInsert, BeforeInsert, BeforeUpdate, Column, Entity, JoinColumn, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { DivisonStatus } from '../enums/divison-status.enum'; 
import { ParentProductCategory } from 'src/parent-product-categorys/entities/parent-product-category.entity';
import { parseDate } from 'src/common/partDateTime';

@Entity()
export class Divison {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    nullable: true,
  })
  code: string;

  @Column()
  name: string;

  @Column()
  createDate: Date;

  @Column()
  updateDate: Date;

  @Column("enum", { enum: DivisonStatus, nullable: true })
  status: string;

  @Column()
  warehouseId: number;

  @OneToMany(() => ParentProductCategory, parentProductCategory => parentProductCategory.divison)
  parentProductCategory: ParentProductCategory[];

  @BeforeInsert()
  private beforeInsert() {
    this.createDate = parseDate(new Date());
    this.updateDate = parseDate(new Date());
    this.status = DivisonStatus.ENABLE;
  }

}

