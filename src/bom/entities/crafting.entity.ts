import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn, DeleteDateColumn } from 'typeorm';
import { Bom } from './bom.entity';
import { CraftingStatus } from '../enums/crafting-status.enum';

@Entity('crafting')
export class Crafting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'bomId' })
  bomId: number;

  @ManyToOne(() => Bom, { 
    onDelete: 'CASCADE',
    createForeignKeyConstraints: true
  })
  @JoinColumn({ name: 'bomId' })
  bom: Bom;

  @Column({ type: 'numeric', precision: 10, scale: 2, transformer: { 
    to: (value: number) => value,
    from: (value: string) => parseFloat(value)
  }})
  quantity: number;

  @Column({ enum: CraftingStatus, default: CraftingStatus.NEW })
  status: CraftingStatus;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deletedAt', nullable: true })
  deletedAt: Date;
} 