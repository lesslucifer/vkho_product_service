import { forwardRef, HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { IdsDTO } from 'src/common/list-id.dto';
import { ResponseDTO } from 'src/common/response.dto';
import { WAREHOUSE_CODE_PATTERN } from 'src/constants/warehouse.constants';
import { ProductFilter } from 'src/product/dto/filter-product.dto';
import { ProductService } from 'src/product/product.service';
import { Repository } from 'typeorm';
import { AddUserToWarehouse } from './dto/add-user-warehouse.dto';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { FilterWarehouseDTO } from './dto/filter-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { Warehouse } from './entities/warehouse.entity';
import { WarehouseStatus } from './enum/status.enum';

@Injectable()
export class WarehouseService {

  private readonly logger = new Logger(WarehouseService.name);

  constructor(
    @InjectRepository(Warehouse)
    private warehouseRepository: Repository<Warehouse>,
    @Inject(forwardRef(() => ProductService))
    private readonly productService: ProductService,
  ) { }

  async create(createWarehouseDto: CreateWarehouseDto) {
    this.logger.log(`Request to save Warehouse: ${createWarehouseDto.name}`);
    const newWarehouse = this.warehouseRepository.create(createWarehouseDto);

    const res = await this.warehouseRepository.save(newWarehouse);

    let sup = await this.warehouseRepository.findOne(res.id);
    sup.code = WAREHOUSE_CODE_PATTERN + res.id;
    await this.warehouseRepository.update(res.id, sup);
    return await this.warehouseRepository.findOne(res.id);
  }

  async addUser(addUserToWarehouse: AddUserToWarehouse) {
    this.logger.log(`Request to add user to Warehouse: ${addUserToWarehouse.warehouseIds}`);
    for (const id of addUserToWarehouse.warehouseIds) {
      const warehouse = await this.warehouseRepository.findOne(id);
      if (!warehouse) throw new RpcException('Not found warehouse');
      if (warehouse.userIds){
        if(!warehouse.userIds.includes(addUserToWarehouse.userId))
          warehouse.userIds.push(addUserToWarehouse.userId);
      }
      else warehouse.userIds = [`${addUserToWarehouse.userId}`];
      await this.warehouseRepository.update(warehouse.id, warehouse);
    }
  }

  async updateUser(addUserToWarehouse: AddUserToWarehouse) {
    this.logger.log(`Request to add user to Warehouse: ${addUserToWarehouse.warehouseIds}`);

    const filter = new FilterWarehouseDTO();
    filter.userId = addUserToWarehouse.userId;
    const warehouseFind = await this.findAll(filter);

    for (const warehouse of warehouseFind?.data) {
      if (warehouse.userIds) {
        warehouse.userIds.splice(warehouse.userIds?.findIndex(e => e?.id === addUserToWarehouse.userId), 1);
        await this.warehouseRepository.update(warehouse.id, warehouse);
      }
    }
    this.addUser(addUserToWarehouse);
  }

  async findAll(filterWarehouseDTO: FilterWarehouseDTO): Promise<ResponseDTO> {
    this.logger.log(`Request to get all Warehouse by userId: ${filterWarehouseDTO.userId}`);

    const queryBuilder = this.warehouseRepository.createQueryBuilder("warehouse");

    if (filterWarehouseDTO.keyword) {
      if (filterWarehouseDTO.keyword.startsWith(WAREHOUSE_CODE_PATTERN)) {
        queryBuilder.andWhere("warehouse.code = :keyword", { keyword: filterWarehouseDTO.keyword })
      } else
        queryBuilder.andWhere("warehouse.name LIKE :keyword", { keyword: `%${filterWarehouseDTO.keyword}%` })
    }

    if (filterWarehouseDTO.startDate && filterWarehouseDTO.endDate) {
      const startDate = filterWarehouseDTO.startDate;
      const endDate = filterWarehouseDTO.endDate;
      queryBuilder.andWhere(`warehouse.createDate BETWEEN '${startDate}' AND '${endDate}'`)
    }

    if (filterWarehouseDTO.userId) {
      queryBuilder.andWhere(":userId = ANY ( string_to_array(warehouse.userIds, ','))", { userId: filterWarehouseDTO.userId });
    }

    const skippedItems = (filterWarehouseDTO?.page - 1) * filterWarehouseDTO?.limit;

    if (!isNaN(skippedItems)) {
      queryBuilder
        .skip(skippedItems)
        .take(filterWarehouseDTO?.limit)
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
    this.logger.log(`Request to get Warehouse: ${id}`);
    const warehouse = await this.warehouseRepository.findOne(id);
    if (warehouse) {
      return warehouse;
    }
    throw new RpcException('Not found warehouse');
  }

  async update(id: number, currentWarehouse: UpdateWarehouseDto) {
    this.logger.log(`Request to update Warehouse: ${id}`);
    if (currentWarehouse.status === WarehouseStatus.DISABLE) {
      const pros = new ProductFilter();
      pros.warehouseId = id;
      const prosTmp = await this.productService.findAll(pros);
      if (prosTmp?.data?.length > 0) {
        throw new RpcException('Because there are still products in warehouse, so it can not switch to disable status');
      }
    }

    await this.warehouseRepository.update(id, currentWarehouse);
    const updateWarehouse = await this.warehouseRepository.findOne(id);
    if (updateWarehouse) {
      return updateWarehouse;
    }
    throw new RpcException('Not found warehouse');
  }

  async remove(id: number) {
    this.logger.log(`Request to remove Warehouse: ${id}`);
    const pros = new ProductFilter();
    pros.warehouseId = id;
    const prosTmp = await this.productService.findAll(pros);
    if (prosTmp?.data?.length > 0) {
      throw new RpcException('Because there are still products in warehouse, so it can not switch to disable status');
    }
    const deleteResponse = await this.warehouseRepository.findOne(id);
    if (!deleteResponse) {
      throw new RpcException('Not found Warehouse');
    }
    deleteResponse.status = WarehouseStatus.DISABLE;
    this.warehouseRepository.save(deleteResponse);
  }

  async removes(idsDTO: IdsDTO) {
    this.logger.log(`Request to remove Warehouse`);
    for (const id of idsDTO.ids) {
      this.remove(Number(id));
    }
  }
}
