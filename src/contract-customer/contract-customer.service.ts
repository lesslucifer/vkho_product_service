import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { ResponseDTO } from 'src/common/response.dto';
import { In, Repository } from 'typeorm';
import {
  ContractCustomerFilter,
  CreateContractCustomerDto,
  GetBySalesUserDto,
  UpdateContractCustomerDto
} from './dto/contract-customer.dto';
import { ContractCustomer } from './entities/contract-customer.entity';
import { ContractCustomerWarehouse } from './entities/contract-customer-warehouse.entity';
import { ContractRecordStatus, ContractStatus } from './enum/contract-customer.enum';

function parseOptionalDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

@Injectable()
export class ContractCustomerService {
  private readonly logger = new Logger(ContractCustomerService.name);

  constructor(
    @InjectRepository(ContractCustomer)
    private readonly contractCustomerRepository: Repository<ContractCustomer>,
    @InjectRepository(ContractCustomerWarehouse)
    private readonly contractCustomerWarehouseRepository: Repository<ContractCustomerWarehouse>
  ) {}

  async create(dto: CreateContractCustomerDto) {
    this.logger.log(`Create contract customer: ${dto.name}`);
    if (!dto.name?.trim()) throw new RpcException('Customer name is required');
    if (!dto.contractCode?.trim()) throw new RpcException('Contract code is required');

    const entity = this.contractCustomerRepository.create({
      name: dto.name.trim(),
      contractCode: dto.contractCode.trim(),
      contractStatus: dto.contractStatus ?? ContractStatus.APPROACHING,
      contractStartDate: parseOptionalDate(dto.contractStartDate),
      contractEndDate: parseOptionalDate(dto.contractEndDate),
      assignedSalesUserId: dto.assignedSalesUserId ?? null,
      assignedSalesUserName: dto.assignedSalesUserName ?? null,
      recordStatus: ContractRecordStatus.ENABLE
    });

    const saved = await this.contractCustomerRepository.save(entity);
    await this.replaceWarehouses(saved.id, dto.warehouseIds ?? []);
    return this.findOne(saved.id);
  }

  async findAll(filter: ContractCustomerFilter): Promise<ResponseDTO> {
    const queryBuilder = this.contractCustomerRepository
      .createQueryBuilder('contractCustomer')
      .leftJoinAndSelect('contractCustomer.warehouses', 'warehouses')
      .where('contractCustomer.recordStatus != :deleted', { deleted: ContractRecordStatus.DELETE });

    if (filter.name) {
      queryBuilder.andWhere('contractCustomer.name ILIKE :name', { name: `%${filter.name}%` });
    }
    if (filter.contractStatus) {
      queryBuilder.andWhere('contractCustomer.contractStatus = :contractStatus', {
        contractStatus: filter.contractStatus
      });
    }
    if (filter.assignedSalesUserId) {
      queryBuilder.andWhere('contractCustomer.assignedSalesUserId = :assignedSalesUserId', {
        assignedSalesUserId: filter.assignedSalesUserId
      });
    }

    const sortBy = filter.sortBy && ['id', 'name', 'contractCode', 'createDate'].includes(filter.sortBy)
      ? filter.sortBy
      : 'id';
    const sortDirection = filter.sortDirection?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    queryBuilder.orderBy(`contractCustomer.${sortBy}`, sortDirection);

    const page = Number(filter.page) || 1;
    const limit = Number(filter.limit) || 1000;
    const skippedItems = (page - 1) * limit;
    if (!Number.isNaN(skippedItems)) {
      queryBuilder.skip(skippedItems).take(limit);
    }

    const [data, totalItem] = await queryBuilder.getManyAndCount();
    const res = new ResponseDTO();
    res.data = data.map((row) => this.toResponse(row));
    res.totalItem = totalItem;
    return res;
  }

  async findOne(id: number) {
    const entity = await this.contractCustomerRepository.findOne({
      where: { id, recordStatus: In([ContractRecordStatus.ENABLE, ContractRecordStatus.DISABLE]) },
      relations: ['warehouses']
    });
    if (!entity) throw new RpcException('Contract customer not found');
    return this.toResponse(entity);
  }

  async update(dto: UpdateContractCustomerDto) {
    const entity = await this.contractCustomerRepository.findOne({
      where: { id: dto.id, recordStatus: In([ContractRecordStatus.ENABLE, ContractRecordStatus.DISABLE]) }
    });
    if (!entity) throw new RpcException('Contract customer not found');

    if (dto.name !== undefined) entity.name = dto.name.trim();
    if (dto.contractCode !== undefined) entity.contractCode = dto.contractCode.trim();
    if (dto.contractStatus !== undefined) entity.contractStatus = dto.contractStatus;
    if (dto.contractStartDate !== undefined) entity.contractStartDate = parseOptionalDate(dto.contractStartDate);
    if (dto.contractEndDate !== undefined) entity.contractEndDate = parseOptionalDate(dto.contractEndDate);
    if (dto.assignedSalesUserId !== undefined) entity.assignedSalesUserId = dto.assignedSalesUserId || null;
    if (dto.assignedSalesUserName !== undefined) entity.assignedSalesUserName = dto.assignedSalesUserName || null;

    await this.contractCustomerRepository.save(entity);
    if (dto.warehouseIds !== undefined) {
      await this.replaceWarehouses(entity.id, dto.warehouseIds);
    }
    return this.findOne(entity.id);
  }

  async remove(id: number) {
    const entity = await this.contractCustomerRepository.findOne({ where: { id } });
    if (!entity) throw new RpcException('Contract customer not found');
    entity.recordStatus = ContractRecordStatus.DELETE;
    await this.contractCustomerRepository.save(entity);
    return { success: true };
  }

  async findBySalesUser(dto: GetBySalesUserDto) {
    if (!dto.assignedSalesUserId) throw new RpcException('assignedSalesUserId is required');
    const result = await this.findAll({
      assignedSalesUserId: dto.assignedSalesUserId,
      page: 1,
      limit: 10000,
      sortBy: 'name',
      sortDirection: 'asc'
    });
    return result;
  }

  private async replaceWarehouses(contractCustomerId: number, warehouseIds: number[]) {
    await this.contractCustomerWarehouseRepository.delete({ contractCustomerId });
    const uniqueIds = [...new Set(warehouseIds.filter((id) => Number.isFinite(Number(id)) && Number(id) > 0))];
    if (!uniqueIds.length) return;
    const rows = uniqueIds.map((warehouseId) =>
      this.contractCustomerWarehouseRepository.create({ contractCustomerId, warehouseId: Number(warehouseId) })
    );
    await this.contractCustomerWarehouseRepository.save(rows);
  }

  private toResponse(entity: ContractCustomer) {
    return {
      id: entity.id,
      name: entity.name,
      contractCode: entity.contractCode,
      contractStatus: entity.contractStatus,
      contractStartDate: entity.contractStartDate,
      contractEndDate: entity.contractEndDate,
      assignedSalesUserId: entity.assignedSalesUserId,
      assignedSalesUserName: entity.assignedSalesUserName,
      recordStatus: entity.recordStatus,
      createDate: entity.createDate,
      updateDate: entity.updateDate,
      warehouseIds: entity.warehouses?.map((w) => w.warehouseId) ?? []
    };
  }
}
