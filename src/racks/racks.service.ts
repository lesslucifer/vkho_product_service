import { forwardRef, HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import moment from 'moment';
import { BlockStatus } from 'src/blocks/enums/block-status.enum';
import { ResponseDTO } from 'src/common/response.dto';
import { RACK_CODE_PATTERN } from 'src/constants/rack.constants';
import { ParentProductCategorysService } from 'src/parent-product-categorys/parent-product-categorys.service';
import { ProductCategorysService } from 'src/product-categorys/product-categorys.service';
import { ProductFilter } from 'src/product/dto/filter-product.dto';
import { ProductService } from 'src/product/product.service';
import { ShelfStatus } from 'src/shelves/enum/shelf-status.enum';
import { ShelfService } from 'src/shelves/shelf.service';
import { Repository } from 'typeorm';
import { CreateRackDto } from './dto/create-rack.dto';
import { RackFilter } from './dto/filter-rack.dto';
import { RecommendDTO } from './dto/recommend-rack.dto';
import { UpdateRackDto } from './dto/update-rack.dto';
import { Rack } from './entities/rack.entity';
import { RackStatus } from './enum/rack.enum';

@Injectable()
export class RacksService {

  private readonly logger = new Logger(RacksService.name);

  constructor(
    @InjectRepository(Rack)
    private rackRepository: Repository<Rack>,

    @Inject(forwardRef(() => ParentProductCategorysService))
    private readonly parentProductCategorysService: ParentProductCategorysService,
    @Inject(forwardRef(() => ShelfService))
    private readonly shelfService: ShelfService,
  ) { }

  async create(createRackDto: CreateRackDto) {
    this.logger.log(`Request to save Rack: ${createRackDto.capacity}`);

    const shelfName = createRackDto?.shelfName;
    const stt = createRackDto.stt;
    const blockCode = createRackDto.blockCode;
    delete createRackDto.shelfName;
    delete createRackDto.stt;
    delete createRackDto.blockCode;

    const newRack = this.rackRepository.create(createRackDto);

    if (createRackDto.parentProductCategoryId)
      newRack.parentProductCategory = await this.parentProductCategorysService.findOne(createRackDto.parentProductCategoryId);

    if (createRackDto.shelfId)
      newRack.shelf = await this.shelfService.findOne(createRackDto.shelfId);

    const res = await this.rackRepository.save(newRack);

    if (stt < 10) res.code = shelfName + "_" + RACK_CODE_PATTERN + "0" + stt;
    else res.code = shelfName + "_" + RACK_CODE_PATTERN + stt;

    await this.rackRepository.update(res.id, res);
    
    const rack = await this.rackRepository.findOne(res.id);
    return rack;
  }

  async findAll(rackFilter: RackFilter): Promise<ResponseDTO> {
    this.logger.log(`Request to get all Rack`);
    const queryBuilder = this.rackRepository.createQueryBuilder("rack");

    if (rackFilter.warehouseId) {
      queryBuilder.where("rack.warehouseId = :warehouseId", { warehouseId: rackFilter.warehouseId })
    }

    if (rackFilter.rackCode) {
      queryBuilder.andWhere("rack.name  = :rackCode", { rackCode: rackFilter.rackCode })
    }

    queryBuilder.andWhere(`rack.status != :status`, { status: RackStatus.DISABLE });

    if (rackFilter.startDate && rackFilter.endDate) {
      const startDate = rackFilter.startDate;
      const endDate = rackFilter.endDate;
      queryBuilder.andWhere(`rack.createDate BETWEEN '${startDate}' AND '${endDate}'`)
    }

    if (rackFilter.sortBy && rackFilter.sortDirection) {
      if (rackFilter.sortDirection.toUpperCase() === "DESC")
        queryBuilder.orderBy(`rack.${rackFilter.sortBy}`, "DESC");
      else queryBuilder.orderBy(`rack.${rackFilter.sortBy}`, "ASC");
    } else {
      queryBuilder.orderBy("rack.id", "ASC");
    }

    const skippedItems = (rackFilter?.page - 1) * rackFilter?.limit;

    if (!isNaN(skippedItems)) {
      queryBuilder
        .skip(skippedItems)
        .take(rackFilter?.limit)
    }

    const data = queryBuilder.getManyAndCount()

    const res = new ResponseDTO();
    await data?.then(rs => {
      res.totalItem = rs[1];
      res.data = rs[0];
    });
    return res;
  }

  async recommendRack(recommendDTO: RecommendDTO): Promise<Rack> {
    this.logger.log(`Request to get recommend Rack`);

    const res =  await this.rackRepository.createQueryBuilder("rack")
      .leftJoinAndSelect("rack.parentProductCategory", "parentProductCategory")
      .where("parentProductCategory.id = :parentProductCategoryId", { parentProductCategoryId: recommendDTO.parentProductCategoryId })
      .andWhere("rack.capacity - rack.usedCapacity >= :totalCapacity", { totalCapacity: recommendDTO.totalCapacity })
      .andWhere("rack.warehouseId = :warehouseId", { warehouseId: recommendDTO.warehouseId })
      .andWhere("rack.status = :status", { status: RackStatus.ENABLE })
      .orderBy("rack.id", "ASC")
      .leftJoinAndSelect("rack.shelf", "shelf")
      .leftJoinAndSelect("shelf.block", "block")
      .getOne();
    
    if (!res) throw new RpcException('There is no suitable location');
    return res;
  }

  async findOne(id: number) {
    this.logger.log(`Request to get Rack: ${id}`);
    const rackExist = await this.rackRepository.findOne(id);
    if (!rackExist) throw new RpcException('Not found rack');
    return this.rackRepository.createQueryBuilder("rack")
      .where("rack.id = :id", { id: id })
      .leftJoinAndSelect("rack.shelf", "shelf")
      .leftJoinAndSelect("shelf.block", "block")
      .getOne();
  }

  async findOneByCode(code: string, warehouseId: number) {
    this.logger.log(`Request to get Rack: ${code}`);
    const rack = await this.rackRepository.createQueryBuilder("rack")
      .where("rack.code = :code", { code: code })
      .andWhere("rack.warehouseId = :warehouseId", { warehouseId: warehouseId })
      .leftJoinAndSelect("rack.shelf", "shelf")
      .leftJoinAndSelect("shelf.block", "block")
      .getOne();
    if (rack) {
      return rack;
    }
    throw new RpcException('Not found rack');
  }

  async update(id: number, currentRack: UpdateRackDto) {
    this.logger.log(`Request to update Rack: ${id}`);
    if (currentRack?.capacity === currentRack?.usedCapacity) currentRack.status = RackStatus.FULL;
    else currentRack.status = RackStatus.ENABLE;

    if (currentRack.parentProductCategoryId)
      currentRack.parentProductCategory = await this.parentProductCategorysService.findOne(currentRack.parentProductCategoryId);

    if (currentRack.shelfId)
      currentRack.shelf = await this.shelfService.findOne(currentRack.shelfId);

    delete currentRack.parentProductCategoryId;
    delete currentRack.shelfId;

    await this.rackRepository.update(id, currentRack);
    const updateRack = await this.rackRepository.findOne(id);
    if (updateRack) {
      return updateRack;
    }
    throw new RpcException('Not found rack');
  }

  async remove(id: number) {
    this.logger.log(`Request to remove Rack: ${id}`);

    const deleteResponse = await this.rackRepository.findOne(id, { relations: ['products'] });
    if (!deleteResponse) {
      throw new RpcException('Not found rack');
    }

    if (deleteResponse?.products?.length > 0) throw new RpcException('Cannot delete rack');

    deleteResponse.status = RackStatus.DISABLE;
    this.rackRepository.save(deleteResponse);
  }
}
