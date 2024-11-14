import { MasterProduct } from 'src/master-products/entities/master-product.entity';
import { ProductHistory } from 'src/product-historys/entities/product-history.entity';
import { Product } from 'src/product/entities/product.entity';
import { Rack } from 'src/racks/entities/rack.entity';
import { ProductCategory } from "src/product-categorys/entities/product-category.entity";
import { AfterInsert, BeforeInsert, BeforeUpdate, Column, Entity, JoinColumn, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ParentProductCategoryStatus } from '../enums/parent-product-category-status.enum';
import { Divison } from 'src/divison/entities/divison.entity';
import { parseDate } from 'src/common/partDateTime';

@Entity()
export class ParentProductCategory {
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

  @Column({
    nullable: true,
  })
  exportStrategy: string;

  @Column("enum", { enum: ParentProductCategoryStatus, nullable: true })
  status: string;

  @Column()
  warehouseId: number;

  @OneToMany(() => ProductCategory, productCategory => productCategory.parentProductCategory)
  productCategory: ProductCategory[];

  @ManyToOne(() => Divison, divison => divison.parentProductCategory)
  divison: Divison;

  @BeforeInsert()
  private beforeInsert() {
    this.createDate = parseDate(new Date());
    this.updateDate = parseDate(new Date());
    this.status = ParentProductCategoryStatus.ENABLE;
  }

}

