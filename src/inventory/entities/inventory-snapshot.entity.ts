import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Warehouse } from 'src/warehouse/entities/warehouse.entity';

@Entity('inventory_snapshots')
@Unique('unique_snapshot', ['warehouseId', 'snapshotDate'])
export class InventorySnapshot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'warehouse_id' })
  warehouseId: number;

  @ManyToOne(() => Warehouse, { onDelete: 'CASCADE' })
  warehouse: Warehouse;

  @Column({ type: 'date', name: 'snapshot_date' })
  snapshotDate: string;

  @Column({ default: 0, name: 'total_quantity' })
  totalQuantity: number;

  @Column({ default: 0, name: 'total_items' })
  totalItems: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
