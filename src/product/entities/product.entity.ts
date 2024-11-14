import { ProductCategory } from 'src/product-categorys/entities/product-category.entity';
import { Supplier } from 'src/suppliers/entities/supplier.entity';
import { Rack } from 'src/racks/entities/rack.entity';
import { AfterInsert, BeforeInsert, Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Receipt } from 'src/receipts/entities/receipt.entity';
import { Zone } from 'src/zone/entities/zone.entity';
import { MasterProduct } from 'src/master-products/entities/master-product.entity';
import { ProductStatus } from '../enum/product-status.enum';
import { Block } from 'src/blocks/entities/block.entity';
import { InBoundKind } from '../enum/inbound-kind.enum';
import { parseDate } from 'src/common/partDateTime';

@Entity()
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    nullable: true,
  })
  code: string;

  @Column({
    nullable: true,
  })
  name: string;

  @Column({ nullable: true })
  totalQuantity: number;

  @Column({ nullable: true })
  expectedQuantity: number;

  @Column()
  importDate: Date;

  @Column({ nullable: true })
  recieveDate: Date;

  @Column({ nullable: true })
  storageDate: Date;

  @Column({ nullable: true })
  lostDate: Date;

  @Column({ nullable: true })
  reportDate: Date;

  @Column({ nullable: true })
  description: string;

  @Column({
    nullable: true,
  })
  cost: number;

  @Column({
    nullable: true,
  })
  note: string;

  @Column({
    nullable: true,
  })
  salePrice: number;

  @Column({ enum: ProductStatus, nullable: true })
  status: ProductStatus;

  @Column()
  warehouseId: number

  @Column({ enum: InBoundKind, nullable: true })
  inboundKind: string;

  @Column({
    nullable: true,
  })
  expireDate: Date;

  @Column({
    nullable: true,
  })
  productCode: string;

  @Column({
    nullable: true,
  })
  idRackReallocate: number;

  @Column({
    nullable: true,
  })
  imageProduct: string;

  @Column({
    nullable: true,
  })
  imageQRCode: string;

  @Column({
    nullable: true,
  })
  imageBarcode: string;

  @ManyToOne(() => Rack, rack => rack.products)
  rack: Rack;

  @ManyToOne(() => Receipt, receipt => receipt.products)
  receipt: Receipt;

  @ManyToOne(() => Zone, zone => zone.products)
  zone: Zone;

  @ManyToOne(() => MasterProduct, masterProduct => masterProduct.products)
  masterProduct: MasterProduct;

  @ManyToOne(() => Block, block => block.products)
  block: Block;

  @ManyToOne(() => Supplier)
  supplier: Supplier;

  @Column({ nullable: true })
  packageCode: string;

  @Column({ nullable: true })
  orderId: number;

  @Column({ nullable: true,readonly :false })
  productCategoryId: number;

  @Column({ nullable: true })
  group: string;

  @Column({
    nullable: true,
  })
  barCode: string;

  @BeforeInsert()
  private beforeInsert() {
    this.importDate = parseDate(new Date());
  }

}
