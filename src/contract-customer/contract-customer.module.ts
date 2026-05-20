import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractCustomerController } from './contract-customer.controller';
import { ContractCustomerService } from './contract-customer.service';
import { ContractCustomer } from './entities/contract-customer.entity';
import { ContractCustomerWarehouse } from './entities/contract-customer-warehouse.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ContractCustomer, ContractCustomerWarehouse])],
  controllers: [ContractCustomerController],
  providers: [ContractCustomerService],
  exports: [ContractCustomerService]
})
export class ContractCustomerModule {}
