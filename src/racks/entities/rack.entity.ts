import { parseDate } from 'src/common/partDateTime';
import { ParentProductCategory } from 'src/parent-product-categorys/entities/parent-product-category.entity';
import { ProductCategory } from 'src/product-categorys/entities/product-category.entity';
import { Product } from 'src/product/entities/product.entity';
import { Shelf } from 'src/shelves/entities/shelf.entity';
import { Van } from 'src/vans/entities/van.entity';
import { AfterInsert, Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { RackStatus } from '../enum/rack.enum';

@Entity()
export class Rack {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    nullable: true,
  })
  code: string;

  @Column({default: parseDate(new Date())})
  createDate: Date;

  @Column('text',
    {
      nullable: false,
      default: RackStatus.ENABLE
    })
  status: RackStatus;

  @Column()
  capacity: number;

  @Column({ default: 0 })
  usedCapacity: number;

  @Column({
    nullable: false,
  })
  warehouseId: number;

  @OneToMany(() => Product, product => product.rack)
  products: Product[];

  @ManyToOne(() => ParentProductCategory)
  parentProductCategory: ParentProductCategory;

  @ManyToOne(() => Shelf, shelf => shelf.racks)
  shelf: Shelf;

  @ManyToOne(() => Van, van => van.racks)
  van: Van;

}

