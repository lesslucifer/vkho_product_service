import { parseDate } from 'src/common/partDateTime';
import { MasterProduct } from 'src/master-products/entities/master-product.entity';
import { ParentProductCategory } from 'src/parent-product-categorys/entities/parent-product-category.entity';
import { Rack } from 'src/racks/entities/rack.entity';
import { AfterInsert, BeforeInsert, BeforeUpdate, Column, Entity, JoinColumn, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ProductCategoryStatus } from '../enums/product-category-status.enum';

@Entity()
export class ProductCategory {
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
  exportStrategy: string;

  @Column()
  createDate: Date;

  @Column()
  updateDate: Date;

  @Column("enum", { enum: ProductCategoryStatus, nullable: true })
  status: string;

  @Column()
  warehouseId: number;

  // @OneToMany(() => Rack, rack => rack.productCategory)
  // racks: Rack[];

  @OneToMany(() => MasterProduct, masterProduct => masterProduct.productCategory)
  masterProducts: MasterProduct[];

  @ManyToOne(() => ParentProductCategory, parentProductCategory => parentProductCategory.productCategory)
  parentProductCategory: ParentProductCategory;

  @BeforeInsert()
  private beforeInsert() {
    this.createDate = parseDate(new Date());
    this.updateDate = parseDate(new Date());
    this.status = ProductCategoryStatus.ENABLE;
  }

}

