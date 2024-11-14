import { forwardRef, HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import moment from 'moment';
import { ResponseDTO } from 'src/common/response.dto';
import { BLOCK_CODE_PATTERN } from 'src/constants/block.constants';
import { UpdateShelfDto } from 'src/shelves/dto/update-shelf.dto';
import { ShelfStatus } from 'src/shelves/enum/shelf-status.enum';
import { ShelfService } from 'src/shelves/shelf.service';
import { Repository } from 'typeorm';
import { AddUserToBlock } from './dto/add-user-block.dto';
import { CreateBlockDto } from './dto/create-block.dto';
import { BlockFilter } from './dto/filter-block.dto';
import { UpdateBlockDto } from './dto/update-block.dto';
import { Block } from './entities/block.entity';
import { BlockStatus } from './enums/block-status.enum';

@Injectable()
export class BlocksService {

  private readonly logger = new Logger(BlocksService.name);

  constructor(
    @InjectRepository(Block)
    private blockRepository: Repository<Block>,
    @Inject(forwardRef(() => ShelfService))
    private readonly shelfService: ShelfService
  ) { }

  async create(createBlockDto: CreateBlockDto) {
    this.logger.log(`Request to save Block: ${createBlockDto.name}`);
    await this.checkNameBlock(createBlockDto.name, createBlockDto.warehouseId);
    const newBlock = this.blockRepository.create(createBlockDto);
    const res = await this.blockRepository.save(newBlock);
    res.code = BLOCK_CODE_PATTERN + res.id;
    await this.blockRepository.update(res.id, res);
    const block = await this.blockRepository.findOne(res.id);
    return block;
  }

  async findAll(blockFilter: BlockFilter): Promise<ResponseDTO> {
    this.logger.log(`Request to get all Block`);
    const queryBuilder = this.blockRepository.createQueryBuilder("block");

    if (blockFilter.warehouseId) {
      queryBuilder.where("block.warehouseId = :warehouseId", { warehouseId: blockFilter.warehouseId })
    }

    if (blockFilter.userId) {
      queryBuilder.andWhere(":userId = ANY ( string_to_array(block.userIds, ','))", { userId: blockFilter.userId });
    }

    if (blockFilter.blockName) {
      queryBuilder.andWhere("block.name LIKE :blockName", { blockName: `%${blockFilter.blockName}%` })
    }

    if (blockFilter.startDate && blockFilter.endDate) {
      const startDate = blockFilter.startDate;
      const endDate = blockFilter.endDate;
      queryBuilder.andWhere(`block.createDate BETWEEN '${startDate}' AND '${endDate}'`)
    }

    queryBuilder.andWhere(`block.status != :status`, { status: BlockStatus.DISABLE });

    if (blockFilter.sortBy && blockFilter.sortDirection) {
      if (blockFilter.sortDirection.toUpperCase() === "DESC")
        queryBuilder.orderBy(`block.${blockFilter.sortBy}`, "DESC");
      else queryBuilder.orderBy(`block.${blockFilter.sortBy}`, "ASC");
    } else {
      queryBuilder.orderBy("block.id", "ASC");
    }

    const skippedItems = (blockFilter?.page - 1) * blockFilter?.limit;

    if (!isNaN(skippedItems)) {
      queryBuilder
        .skip(skippedItems)
        .take(blockFilter?.limit)
    }

    const data = queryBuilder
      .leftJoinAndSelect("block.shelfs", "shelfs", "shelfs.status != :status", { status: ShelfStatus.DISABLE })
      .orderBy('shelfs.createDate', 'ASC')
      .leftJoinAndSelect("shelfs.racks", "racks")
      .getManyAndCount();

    const res = new ResponseDTO();
    await data?.then(rs => {
      res.totalItem = rs[1];
      res.data = rs[0];
    });
    return res;
  }

  async findOne(id: number) {
    const block = await this.blockRepository.createQueryBuilder("block")
      .leftJoinAndSelect("block.shelfs", "shelfs", "shelfs.status != :status", { status: ShelfStatus.DISABLE })
      .andWhere("block.id = :id", { id })
      .getOne();
    if (block) {
      return block;
    }
    throw new RpcException('Not found block');
  }

  async update(id: number, currentBlock: UpdateBlockDto) {
    this.logger.log(`Request to update Block: ${id}`);
    const beforeUpdate = await this.blockRepository.findOne(id);
    if (currentBlock.name && beforeUpdate.name !== currentBlock.name) {
      await this.checkNameBlock(currentBlock.name, currentBlock.warehouseId);
    }
    await this.blockRepository.update(id, currentBlock);
    const updateBlock = await this.blockRepository.findOne(id);
    if (updateBlock) {
      return updateBlock;
    }
    throw new RpcException('Not found block');
  }

  async remove(id: number) {
    this.logger.log(`Request to delete Block: ${id}`);
    const deleteResponse = await this.blockRepository.findOne(id, { relations: ['products', 'shelfs'] });
    if (!deleteResponse) {
      throw new RpcException('Not found block');
    }
    if (deleteResponse?.products?.length > 0) throw new RpcException('Cannot delete block');

    if (deleteResponse.shelfs) {
      for (const shelf of deleteResponse.shelfs) {
        shelf.status = ShelfStatus.DISABLE;
        await this.shelfService.remove(shelf.id);
      }
    }
    deleteResponse.status = BlockStatus.DISABLE;
    this.blockRepository.save(deleteResponse);
  }

  async checkNameBlock(name: string, warehouseId: number) {
    const queryBuilder = this.blockRepository.createQueryBuilder("block");
    queryBuilder.where("block.warehouseId = :warehouseId", { warehouseId: warehouseId })
    queryBuilder.andWhere("block.status != :status", { status: BlockStatus.DISABLE})
    queryBuilder.andWhere("block.name = :name", { name: name?.trim() })
    const res = await queryBuilder.getCount();
    if (res > 0) throw new RpcException(`This ${name} name already exists`);
  }

  async addUser(addUserToWarehouse: AddUserToBlock) {
    this.logger.log(`Request to add user to Warehouse: ${addUserToWarehouse.blockIds}`);
    for (const id of addUserToWarehouse.blockIds) {
      const warehouse = await this.blockRepository.findOne(id);
      if (!warehouse) throw new RpcException('Not found block');
      if (warehouse.userIds){
        if(!warehouse.userIds.includes(addUserToWarehouse.userId))
          warehouse.userIds.push(addUserToWarehouse.userId);
      }
      else warehouse.userIds = [`${addUserToWarehouse.userId}`];
      await this.blockRepository.update(warehouse.id, warehouse);
    }
  }

  async updateUser(addUserToWarehouse: AddUserToBlock) {
    this.logger.log(`Request to add user to Block: ${addUserToWarehouse.blockIds}`);

    const filter = new BlockFilter();
    filter.userId = addUserToWarehouse.userId;
    const warehouseFind = await this.findAll(filter);

    for (const warehouse of warehouseFind?.data) {
      if (warehouse.userIds) {
        warehouse.userIds.splice(warehouse.userIds?.findIndex(e => e?.id === addUserToWarehouse.userId), 1);
        await this.blockRepository.update(warehouse.id, warehouse);
      }
    }
    this.addUser(addUserToWarehouse);
  }

}
