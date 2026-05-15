import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('replenishment_shortage_snapshot')
@Index(['scanDate', 'warehouseId'])
@Index(['scanDate', 'replenishmentId'], { unique: true })
export class ReplenishmentShortageSnapshot {
  @PrimaryGeneratedColumn()
  id: number;

  /** Local server calendar day YYYY-MM-DD when the nightly scan ran */
  @Column({ type: 'varchar', length: 10 })
  scanDate: string;

  @Column()
  replenishmentId: number;

  @Column()
  warehouseId: number;

  @Column()
  masterProductId: number;

  @Column({ nullable: true })
  productCode: string | null;

  @Column()
  productName: string;

  @Column({ nullable: true })
  categoryId: number | null;

  @Column({ nullable: true })
  categoryName: string | null;

  @Column({ nullable: true })
  supplierName: string | null;

  @Column({ type: 'int' })
  min: number;

  @Column({ type: 'int' })
  max: number;

  @Column({ type: 'int' })
  onHand: number;

  @Column({ type: 'int' })
  toOrder: number;

  @Column({ type: 'int' })
  shortageBelowMin: number;

  @Column({ default: false })
  isNewSincePreviousScan: boolean;
}
