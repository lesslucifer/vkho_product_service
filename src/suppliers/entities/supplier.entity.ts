import { parseDate } from 'src/common/partDateTime';
import { MasterProduct } from 'src/master-products/entities/master-product.entity';
import { ProductCategory } from 'src/product-categorys/entities/product-category.entity';
import { Product } from 'src/product/entities/product.entity';
import { Receipt } from 'src/receipts/entities/receipt.entity';
import { AfterInsert, BeforeInsert, Column, Entity, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { SupplierStatus } from '../enums/supplier-status.enum';

@Entity()
export class Supplier {
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

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({
    nullable: true,
  })
  address: string;

  @Column()
  createDate: Date;

  @Column({ nullable: true })
  updateDate: Date;

  @Column({ nullable: true })
  cooperationDay: Date;

  @Column({ enum: SupplierStatus, nullable: true })
  status: SupplierStatus;

  @Column()
  warehouseId: number;

  @OneToMany(() => Receipt, receipt => receipt.supplier)
  receipts: Receipt[];

  @ManyToMany(() => ProductCategory)
  @JoinTable()
  productCategorys: ProductCategory[];

  // @ManyToOne(() => MasterProduct, masterProduct => masterProduct.suppliers)
  // masterProduct: MasterProduct;

  @Column({ nullable: true })
  isActive: boolean;

  @Column({ nullable: true })
  contractNumber: string;

  @Column({ nullable: true })
  taxCode: string;

  @BeforeInsert()
  private beforeInsert() {
    this.createDate = parseDate(new Date());
    this.updateDate = parseDate(new Date());
    this.status = SupplierStatus.ENABLE;
  }
}


