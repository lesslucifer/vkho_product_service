import { forwardRef, HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateShelfDto } from 'src/shelves/dto/create-shelf.dto';
import { UpdateShelfDto } from 'src/shelves/dto/update-shelf.dto';
import { Van } from './entities/van.entity';
import { SHELF_CODE_PATTERN } from 'src/constants/shelves.constants';
import { ProductCategorysService } from 'src/product-categorys/product-categorys.service';
import { BlocksService } from 'src/blocks/blocks.service';
import { CreateRackDto } from 'src/racks/dto/create-rack.dto';
import { RacksService } from 'src/racks/racks.service';
import { Rack } from 'src/racks/entities/rack.entity';
import { RackDTO } from 'src/racks/dto/response-rack.dto';
import { VanDTO } from './dto/response-van.dto';
import { VanStatus } from './enum/van-status.enum';
import { ReceiptFilter } from 'src/receipts/dto/filter-receipt.dto';
import { VanFilter } from './dto/filter-van.dto';
import { ResponseDTO } from 'src/common/response.dto';
import { RpcException } from '@nestjs/microservices';
import { ProductFilter } from 'src/product/dto/filter-product.dto';
import { ProductService } from 'src/product/product.service';
import { RackStatus } from 'src/racks/enum/rack.enum';
import { ParentProductCategorysService } from 'src/parent-product-categorys/parent-product-categorys.service';
import { UpdateVanDto } from './dto/update-van.dto';
import { VAN_CODE_PATTERN } from 'src/constants/van.constants';

@Injectable()
export class VanService {

  private readonly logger = new Logger(VanService.name);

  constructor(
    @InjectRepository(Van)
    private shelfRepository: Repository<Van>,
    @Inject(forwardRef(() => ParentProductCategorysService))
    private readonly parentProductCategorysService: ParentProductCategorysService,
    @Inject(forwardRef(() => BlocksService))
    private readonly blocksService: BlocksService,
    @Inject(forwardRef(() => RacksService))
    private readonly racksService: RacksService,
    @Inject(forwardRef(() => ProductService))
    private readonly productService: ProductService
  ) { }

  async create(createShelfDto: CreateShelfDto) {
    this.logger.log(`Request to save Van: ${createShelfDto.name}`);

    await this.checkNameShelf(createShelfDto.name, createShelfDto.blockId);

    const newShelf = this.shelfRepository.create(createShelfDto);

    if (createShelfDto.blockId)
      newShelf.block = await this.blocksService.findOne(createShelfDto.blockId);

    if (createShelfDto.parentProductCategoryId)
      newShelf.parentProductCategory = await this.parentProductCategorysService.findOne(createShelfDto.parentProductCategoryId);

    const res = await this.shelfRepository.save(newShelf);
    const racks = [];
    let stt = 0; 
    if (createShelfDto.totalRack) {
      for (let i = 0; i < createShelfDto.totalRack; i++) {
        let rack = new CreateRackDto();
        rack.warehouseId = createShelfDto.warehouseId;
        rack.capacity = createShelfDto.capacity;
        rack.parentProductCategoryId = createShelfDto.parentProductCategoryId;
        rack.shelfId = res.id;
        rack.usedCapacity = 0;
        rack.shelfName = res.name;
        rack.stt = ++stt;
        if (newShelf.block) rack.blockCode = newShelf.block.code;
        const rackRes = await this.createRack(rack);

        let dto = new RackDTO();
        dto = Object.assign(dto, rackRes);
        racks.push(dto);
      }
    }

    res.code = VAN_CODE_PATTERN + res.id;
    await this.shelfRepository.update(res.id, res);
    const updateShelf = await this.shelfRepository.findOne(res.id, { relations: ["parentProductCategory"] });
    let shelfDto = new VanDTO();
    shelfDto = Object.assign(shelfDto, updateShelf);
    shelfDto.racks = racks;
    return shelfDto;
  }

  createRack(createRack: CreateRackDto): Promise<Rack> {
    return this.racksService.create(createRack);
  }

  async findAll(shelfFilter: VanFilter): Promise<ResponseDTO> {
    this.logger.log(`Request to get all Shelf`);

    const queryBuilder = this.shelfRepository.createQueryBuilder("shelf");

    if (shelfFilter.warehouseId) {
      queryBuilder.where("shelf.warehouseId = :warehouseId", { warehouseId: shelfFilter.warehouseId })
    }

    if (shelfFilter.ids) {
      const ids = shelfFilter.ids?.split(",");
      queryBuilder.andWhere("shelf.id IN (:...ids)", { ids: ids });
    }

    if (shelfFilter.startDate && shelfFilter.endDate) {
      const startDate = shelfFilter.startDate;
      const endDate = shelfFilter.endDate;
      queryBuilder.andWhere(`shelf.createDate BETWEEN '${startDate}' AND '${endDate}'`)
    }

    if (shelfFilter.sortBy && shelfFilter.sortDirection) {
      if (shelfFilter.sortDirection.toUpperCase() === "DESC")
        queryBuilder.orderBy(`shelf.${shelfFilter.sortBy}`, "DESC");
      else queryBuilder.orderBy(`shelf.${shelfFilter.sortBy}`, "ASC");
    } else {
      queryBuilder.orderBy("shelf.id", "ASC");
    }
    queryBuilder.addOrderBy("shelf.position", "ASC");
    queryBuilder.andWhere("shelf.status != :status", { status: VanStatus.DISABLE })

    const skippedItems = (shelfFilter?.page - 1) * shelfFilter?.limit;

    if (!isNaN(skippedItems)) {
      queryBuilder
        .skip(skippedItems)
        .take(shelfFilter?.limit)
    }

    const data = queryBuilder
      .leftJoinAndSelect("shelf.racks", "racks")
      .leftJoinAndSelect("shelf.parentProductCategory", "parentProductCategory")
      .getManyAndCount()

    const res = new ResponseDTO();
    await data?.then(rs => {
      res.totalItem = rs[1];
      res.data = rs[0];
    });
    return res;
  }

  async findOne(id: number) {
    this.logger.log(`Request to get Shelf: ${id}`);
    const Shelf = await this.shelfRepository.findOne(id, { relations: ["parentProductCategory", "racks"] });
    if (Shelf) {
      return Shelf;
    }
    throw new RpcException('Not found Shelf');
  }

  async update(id: number, currentShelf: UpdateVanDto) {
    this.logger.log(`Request to update Shelf: ${id}`);
    this.validateInputs(currentShelf);
    const beforeUpdate = await this.shelfRepository.findOne(id);
    if (!beforeUpdate) {
      throw new RpcException('Not found Shelf');
    }
    
    if (currentShelf.name && beforeUpdate.name !== currentShelf.name) {
      await this.checkNameShelf(currentShelf.name, currentShelf.warehouseId);
    }
    if (currentShelf.blockId)
      currentShelf.block = await this.blocksService.findOne(currentShelf.blockId);

    if (currentShelf.parentProductCategoryId)
      currentShelf.parentProductCategory = await this.parentProductCategorysService.findOne(currentShelf.parentProductCategoryId);

    delete currentShelf.blockId;
    delete currentShelf.parentProductCategoryId;

    await this.shelfRepository.update(id, currentShelf);
    const updateShelf = await this.shelfRepository.findOne(id, { relations: ["racks"] });

    if (beforeUpdate.capacity !== updateShelf.capacity) {
      for (const rack of updateShelf.racks) {
        rack.capacity = updateShelf.capacity;
        await this.racksService.update(rack.id, rack);
      }
    }

    return updateShelf;
  }

  async remove(id: number) {
    this.logger.log(`Request to remove Shelf: ${id}`);

    const deleteResponse = await this.shelfRepository.findOne(id, { relations:['racks']});
    if (!deleteResponse) {
      throw new RpcException('Not found shelf');
    }
    if(deleteResponse.racks) {
      let filterProduct = new ProductFilter();
      for (const rack of deleteResponse.racks) {
        filterProduct.rackId = rack.id;
        const existedData = await this.productService.findAll(filterProduct);
        if (existedData?.data?.length > 0) throw new RpcException('Cannot delete shelf');
      }
      for (const rack of deleteResponse.racks) {
        rack.status = RackStatus.DISABLE;
        await this.racksService.remove(rack.id);
      }
    }
    deleteResponse.status = VanStatus.DISABLE;
    this.shelfRepository.save(deleteResponse);
  }

  validateInputs(she) {

    if (she.status) {
      if (!Object.values(VanStatus).includes(she.status))
        throw new RpcException('Status incorrect!');
    }

    if (she.totalRack) {
      if (she.totalRack < 0)
        throw new RpcException('Total rack incorrect!');
    }
    
  }

  async checkNameShelf(name: string, blockId: number) {
    const queryBuilder = this.shelfRepository.createQueryBuilder("shelf");
    queryBuilder.where("shelf.blockId = :blockId", { blockId: blockId })
    queryBuilder.andWhere("shelf.status != :status", { status: VanStatus.DISABLE})
    queryBuilder.andWhere("shelf.name = :name", { name: name?.trim() })
    const res = await queryBuilder.getCount();
    if (res > 0) throw new RpcException(`This ${name} name already exists`);
  }

}
