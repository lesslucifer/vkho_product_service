import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { IdsDTO } from 'src/common/list-id.dto';
import { ResponseDTO } from 'src/common/response.dto';
import { WAREHOUSE_GROUP_CODE_PATTERN } from 'src/constants/warehouse-group.constants';
import { Repository } from 'typeorm';
import { CreateWarehouseGroupDto } from './dto/create-warehouse-group.dto';
import { FilterWarehouseGroupDTO } from './dto/filter-warehouse-group.dto';
import { UpdateWarehouseGroupDto } from './dto/update-warehouse-group.dto';
import { WarehouseGroup } from './entities/warehouse-group.entity';

@Injectable()
export class WarehouseGroupService {

  private readonly logger = new Logger(WarehouseGroupService.name);

  constructor(
    @InjectRepository(WarehouseGroup)
    private warehouseGroupRepository: Repository<WarehouseGroup>,
  ) { }

  async create(createWarehouseGroupDto: CreateWarehouseGroupDto) {
    this.logger.log(`Request to save WarehouseGroup: ${createWarehouseGroupDto.name}`);
    const newWarehouseGroup = this.warehouseGroupRepository.create(createWarehouseGroupDto);

    const res = await this.warehouseGroupRepository.save(newWarehouseGroup);

    let group = await this.warehouseGroupRepository.findOne({ where: { id: res.id } });
    group.code = WAREHOUSE_GROUP_CODE_PATTERN + res.id;
    await this.warehouseGroupRepository.update(res.id, group);
    return await this.warehouseGroupRepository.findOne({ where: { id: res.id } });
  }

  async findAll(filterWarehouseGroupDTO: FilterWarehouseGroupDTO): Promise<ResponseDTO> {
    this.logger.log(`Request to get all WarehouseGroup by userId: ${filterWarehouseGroupDTO.userId}`);

    const queryBuilder = this.warehouseGroupRepository.createQueryBuilder("warehouseGroup");

    if (filterWarehouseGroupDTO.keyword) {
      if (filterWarehouseGroupDTO.keyword.startsWith(WAREHOUSE_GROUP_CODE_PATTERN)) {
        queryBuilder.andWhere("warehouseGroup.code = :keyword", { keyword: filterWarehouseGroupDTO.keyword })
      } else
        queryBuilder.andWhere("warehouseGroup.name LIKE :keyword", { keyword: `%${filterWarehouseGroupDTO.keyword}%` })
    }

    if (filterWarehouseGroupDTO.startDate && filterWarehouseGroupDTO.endDate) {
      const startDate = filterWarehouseGroupDTO.startDate;
      const endDate = filterWarehouseGroupDTO.endDate;
      queryBuilder.andWhere(`warehouseGroup.createDate BETWEEN '${startDate}' AND '${endDate}'`)
    }

    if (filterWarehouseGroupDTO.userId) {
      queryBuilder.andWhere("warehouseGroup.userId = :userId", { userId: filterWarehouseGroupDTO.userId });
    }

    const skippedItems = (filterWarehouseGroupDTO?.page - 1) * filterWarehouseGroupDTO?.limit;

    if (!isNaN(skippedItems)) {
      queryBuilder
        .skip(skippedItems)
        .take(filterWarehouseGroupDTO?.limit)
    }

    const data = queryBuilder
      .getManyAndCount();

    const res = new ResponseDTO();
    await data?.then(rs => {
      res.totalItem = rs[1];
      res.data = rs[0];
    });
    return res;
  }

  async findOne(id: number) {
    this.logger.log(`Request to get WarehouseGroup: ${id}`);
    const warehouseGroup = await this.warehouseGroupRepository.findOne({ where: { id: id } });
    if (warehouseGroup) {
      return warehouseGroup;
    }
    throw new RpcException('Not found warehouse group');
  }

  async findByUserId(userId: string): Promise<ResponseDTO> {
    this.logger.log(`Request to get WarehouseGroup by userId: ${userId}`);
    const filter = new FilterWarehouseGroupDTO();
    filter.userId = userId;
    return await this.findAll(filter);
  }

  async update(id: number, updateWarehouseGroupDto: UpdateWarehouseGroupDto) {
    this.logger.log(`Request to update WarehouseGroup: ${id}`);

    await this.warehouseGroupRepository.update(id, updateWarehouseGroupDto);
    const updatedWarehouseGroup = await this.warehouseGroupRepository.findOne({ where: { id: id } });
    if (updatedWarehouseGroup) {
      return updatedWarehouseGroup;
    }
    throw new RpcException('Not found warehouse group');
  }

  async remove(id: number) {
    this.logger.log(`Request to remove WarehouseGroup: ${id}`);
    const deleteResponse = await this.warehouseGroupRepository.findOne({ where: { id: id } });
    if (!deleteResponse) {
      throw new RpcException('Not found WarehouseGroup');
    }
    deleteResponse.status = 'DISABLE';
    this.warehouseGroupRepository.save(deleteResponse);
  }

  async removes(idsDTO: IdsDTO) {
    this.logger.log(`Request to remove WarehouseGroup`);
    for (const id of idsDTO.ids) {
      this.remove(Number(id));
    }
  }
}
