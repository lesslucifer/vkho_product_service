import { parseDate } from 'src/common/partDateTime';
import { Product } from 'src/product/entities/product.entity';
import { AfterInsert, BeforeInsert, Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ZoneStatus } from '../enums/supplier-status.enum';

@Entity()
export class Zone {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    nullable: true,
  })
  code: string;

  @Column()
  createDate: Date;

  @Column()
  capcity: Number;

  @Column()
  name: string;

  @Column({ enum: ZoneStatus , nullable: true})
  status: string;

  @Column()
  warehouseId: number;

  @OneToMany(() => Product, product => product.zone)
  products: Product[];
  
  @BeforeInsert()
  private beforeInsert() {
    this.createDate = parseDate(new Date());
    this.status = ZoneStatus.ENABLE;
  }
  
}
