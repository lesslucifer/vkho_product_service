import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';
import { BomComponent } from '../../bom-component/entities/bom-component.entity';
import { BomStatus } from '../enum/bom-status.enum';

@Entity('bom')
export class Bom {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'masterProductId' })
  masterProductId: number;

  @Column({ name: 'warehouseId' })
  warehouseId: number;

  @Column({ type: 'varchar', length: 20 })
  status: BomStatus;

  @OneToMany(() => BomComponent, component => component.bom)
  components: BomComponent[];

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deletedAt', nullable: true })
  deletedAt: Date;
} 