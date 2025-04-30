import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { BomComponent } from '../../bom-component/entities/bom-component.entity';
import { BomStatus } from '../enum/bom-status.enum';
import { Warehouse } from 'src/warehouse/entities/warehouse.entity';

@Entity('bom')
export class Bom {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string;

  @ManyToOne(() => Warehouse, { 
    onDelete: 'CASCADE',
    createForeignKeyConstraints: true
  })
  @JoinColumn({ name: 'warehouseId' })
  warehouse: Warehouse;

  @Column({ type: 'varchar', length: 20 })
  status: BomStatus;

  @OneToMany(() => BomComponent, component => component.bom)
  bomComponents: BomComponent[];

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deletedAt', nullable: true })
  deletedAt: Date;
} 