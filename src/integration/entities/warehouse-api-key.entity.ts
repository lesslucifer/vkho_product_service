import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('warehouse_api_keys')
export class WarehouseApiKey {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  warehouseId: number;

  @Column({ length: 16 })
  keyPrefix: string;

  @Column()
  keyHash: string;

  @Column('simple-array')
  scopes: string[];

  @Column({ nullable: true })
  createdBy: string;

  @Column({ type: 'timestamp' })
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  revokedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt: Date | null;
}
