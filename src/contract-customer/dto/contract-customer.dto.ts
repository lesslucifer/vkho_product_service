import { ContractStatus } from '../enum/contract-customer.enum';

export class CreateContractCustomerDto {
  name: string;
  contractCode: string;
  contractStatus?: ContractStatus;
  contractStartDate?: Date | string;
  contractEndDate?: Date | string;
  assignedSalesUserId?: string;
  assignedSalesUserName?: string;
  warehouseIds?: number[];
}

export class UpdateContractCustomerDto extends CreateContractCustomerDto {
  id: number;
}

export class ContractCustomerFilter {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  name?: string;
  contractStatus?: ContractStatus;
  assignedSalesUserId?: string;
}

export class GetBySalesUserDto {
  assignedSalesUserId: string;
}
