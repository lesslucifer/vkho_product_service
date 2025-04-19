import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Bom } from '../../bom/entities/bom.entity';
import { Product } from '../../product/entities/product.entity';

@Entity('bom_component')
export class BomComponent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'bomId' })
  bomId: number;

  @Column({ name: 'productId' })
  productId: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  quantity: number;

  @Column({ length: 10 })
  unit: string;

  @Column({ length: 50, nullable: true })
  color: string;

  @Column({ length: 50, nullable: true })
  drawers: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @ManyToOne(() => Bom, bom => bom.components, { 
    onDelete: 'CASCADE',
    createForeignKeyConstraints: false // This prevents TypeORM from creating additional columns
  })
  bom: Bom;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
} 