import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn, DeleteDateColumn } from 'typeorm';
import { Bom } from '../../bom/entities/bom.entity';
import { MasterProduct } from 'src/master-products/entities/master-product.entity';

@Entity('bom_component')
export class BomComponent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'bomId' })
  bomId: number;

  @Column({ name: 'masterProductId' })
  masterProductId: number;

  @ManyToOne(() => MasterProduct, { 
    onDelete: 'CASCADE',
    createForeignKeyConstraints: true
  })
  @JoinColumn({ name: 'masterProductId' })
  masterProduct: MasterProduct;

  @Column({ type: 'numeric', precision: 10, scale: 2, transformer: { 
    to: (value: number) => value,
    from: (value: string) => parseFloat(value)
  }})
  quantity: number;

  @Column({ length: 10 })
  unit: string;

  @Column({ length: 50, nullable: true })
  color: string;

  @Column({ length: 50, nullable: true })
  drawers: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @ManyToOne(() => Bom, bom => bom.bomComponents, { 
    onDelete: 'CASCADE',
    createForeignKeyConstraints: false
  })
  bom: Bom;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deletedAt' })
  deletedAt: Date;
} 