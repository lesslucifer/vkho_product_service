import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CONTRACT_CUSTOMER_PATTERN } from 'src/constants/contract-customer.constants';
import {
  ContractCustomerFilter,
  CreateContractCustomerDto,
  GetBySalesUserDto,
  UpdateContractCustomerDto
} from './dto/contract-customer.dto';
import { ContractCustomerService } from './contract-customer.service';

@Controller()
export class ContractCustomerController {
  constructor(private readonly contractCustomerService: ContractCustomerService) {}

  @MessagePattern(CONTRACT_CUSTOMER_PATTERN.CONTRACT_CUSTOMER_CREATE)
  create(@Payload() dto: CreateContractCustomerDto) {
    return this.contractCustomerService.create(dto);
  }

  @MessagePattern(CONTRACT_CUSTOMER_PATTERN.CONTRACT_CUSTOMER_GET_ALL)
  findAll(@Payload() filter: ContractCustomerFilter) {
    return this.contractCustomerService.findAll(filter);
  }

  @MessagePattern(CONTRACT_CUSTOMER_PATTERN.CONTRACT_CUSTOMER_GET_ONE)
  findOne(@Payload() id: number) {
    return this.contractCustomerService.findOne(Number(id));
  }

  @MessagePattern(CONTRACT_CUSTOMER_PATTERN.CONTRACT_CUSTOMER_UPDATE)
  update(@Payload() dto: UpdateContractCustomerDto) {
    return this.contractCustomerService.update(dto);
  }

  @MessagePattern(CONTRACT_CUSTOMER_PATTERN.CONTRACT_CUSTOMER_DELETE)
  remove(@Payload() id: number) {
    return this.contractCustomerService.remove(Number(id));
  }

  @MessagePattern(CONTRACT_CUSTOMER_PATTERN.CONTRACT_CUSTOMER_GET_BY_SALES_USER)
  findBySalesUser(@Payload() dto: GetBySalesUserDto) {
    return this.contractCustomerService.findBySalesUser(dto);
  }
}
