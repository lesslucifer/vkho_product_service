import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ContractCustomer } from './contract-customer.entity';

@Entity('contract_customer_warehouse')
export class ContractCustomerWarehouse {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  contractCustomerId: number;

  @Column()
  warehouseId: number;

  @ManyToOne(() => ContractCustomer, (customer) => customer.warehouses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'contractCustomerId' })
  contractCustomer: ContractCustomer;
}
