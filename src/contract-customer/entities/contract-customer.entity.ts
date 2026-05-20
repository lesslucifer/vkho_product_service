import { parseDate } from 'src/common/partDateTime';
import { BeforeInsert, BeforeUpdate, Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ContractCustomerWarehouse } from './contract-customer-warehouse.entity';
import { ContractRecordStatus, ContractStatus } from '../enum/contract-customer.enum';

@Entity('contract_customer')
export class ContractCustomer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  contractCode: string;

  @Column({ enum: ContractStatus, default: ContractStatus.APPROACHING })
  contractStatus: ContractStatus;

  @Column({ type: 'date', nullable: true })
  contractStartDate: Date;

  @Column({ type: 'date', nullable: true })
  contractEndDate: Date;

  @Column({ nullable: true })
  assignedSalesUserId: string;

  @Column({ nullable: true })
  assignedSalesUserName: string;

  @Column({ enum: ContractRecordStatus, default: ContractRecordStatus.ENABLE })
  recordStatus: ContractRecordStatus;

  @Column()
  createDate: Date;

  @Column({ nullable: true })
  updateDate: Date;

  @OneToMany(() => ContractCustomerWarehouse, (row) => row.contractCustomer, { cascade: true })
  warehouses: ContractCustomerWarehouse[];

  @BeforeInsert()
  private beforeInsert() {
    this.createDate = parseDate(new Date());
    this.updateDate = parseDate(new Date());
    if (!this.recordStatus) {
      this.recordStatus = ContractRecordStatus.ENABLE;
    }
  }

  @BeforeUpdate()
  private beforeUpdate() {
    this.updateDate = parseDate(new Date());
  }
}
