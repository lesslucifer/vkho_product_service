import { forwardRef, HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateShelfDto } from 'src/shelves/dto/create-shelf.dto';
import { UpdateShelfDto } from 'src/shelves/dto/update-shelf.dto';
import { Shelf } from './entities/shelf.entity';
import { SHELF_CODE_PATTERN } from 'src/constants/shelves.constants';
import { ProductCategorysService } from 'src/product-categorys/product-categorys.service';
import { BlocksService } from 'src/blocks/blocks.service';
import { CreateRackDto } from 'src/racks/dto/create-rack.dto';
import { RacksService } from 'src/racks/racks.service';
import { Rack } from 'src/racks/entities/rack.entity';
import { RackDTO } from 'src/racks/dto/response-rack.dto';
import { ShelfDTO } from './dto/response-shelf.dto';
import { ShelfStatus } from './enum/shelf-status.enum';
import { ReceiptFilter } from 'src/receipts/dto/filter-receipt.dto';
import { ShelfFilter } from './dto/filter-shelf.dto';
import { ResponseDTO } from 'src/common/response.dto';
import { RpcException } from '@nestjs/microservices';
import { ProductFilter } from 'src/product/dto/filter-product.dto';
import { ProductService } from 'src/product/product.service';
import { RackStatus } from 'src/racks/enum/rack.enum';
import { ParentProductCategorysService } from 'src/parent-product-categorys/parent-product-categorys.service';
import readXlsxFile from 'read-excel-file/node';
import * as fs from 'fs';
import { BufferedFile } from 'src/common/buffered-file.dto';

@Injectable()
export class ShelfService {

  private readonly logger = new Logger(ShelfService.name);

  constructor(
    @InjectRepository(Shelf)
    private shelfRepository: Repository<Shelf>,
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
    this.logger.log(`Request to save Shelf: ${createShelfDto.name}`);

    //await this.checkNameShelf(createShelfDto.name, createShelfDto.blockId);

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

    res.code = SHELF_CODE_PATTERN + res.id;
    await this.shelfRepository.update(res.id, res);
    const updateShelf = await this.shelfRepository.findOne(res.id, { relations: ["parentProductCategory"] });
    let shelfDto = new ShelfDTO();
    shelfDto = Object.assign(shelfDto, updateShelf);
    shelfDto.racks = racks;
    return shelfDto;
  }

  async createExcel(createDivisonDto: BufferedFile) {
    this.logger.log(`Request to save shelf through excel`);
    this.readExcel(createDivisonDto);
  }

  async readExcel(dataExcel: BufferedFile) {
    const res = [];
    const filename = __dirname + dataExcel.fieldname + "-" + Date.now() + "-" + dataExcel.originalname;
    await fs.writeFile(filename, Buffer.from(dataExcel.buffer), 'binary', (err) => {
      if (err)
        console.log(err);
      else {
        readXlsxFile(filename)
          .then(async (row) => {
            let i = 0;
            for (const data of row) {
              if (i >= 1) {
                const master = new CreateShelfDto();

                if(data[0])
                  master.name = data[0].toString();

                if(data[1])
                  master.position = parseInt(data[1].toString());

                if(data[2])
                  master.totalRack = parseInt(data[2].toString());

                if (data[3])
                  master.medium = parseInt(data[3].toString());

                if (data[4])
                  master.high = parseInt(data[4].toString());

                if (data[5])
                  master.capacity = parseInt(data[5].toString());

                if (data[6])
                  master.blockId = parseInt(data[6].toString());

                if (data[7])
                  master.parentProductCategoryId = parseInt(data[7].toString());

                master.warehouseId = dataExcel.warehouseId;
                const masterItem = await this.create(master);

                res.push(masterItem);
              }
              i++;
            }

          })
          .then(() => {
            fs.unlink(filename, (err) => {
              if (err) console.log(err);
            })
          }).catch(err => {
            console.log(err);
          })
      }
    });
    return res;
  }

  createRack(createRack: CreateRackDto): Promise<Rack> {
    return this.racksService.create(createRack);
  }

  async findAll(shelfFilter: ShelfFilter): Promise<ResponseDTO> {
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
    queryBuilder.andWhere("shelf.status != :status", { status: ShelfStatus.DISABLE })

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

  async update(id: number, currentShelf: UpdateShelfDto) {
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
    deleteResponse.status = ShelfStatus.DISABLE;
    this.shelfRepository.save(deleteResponse);
  }

  validateInputs(she) {

    if (she.status) {
      if (!Object.values(ShelfStatus).includes(she.status))
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
    queryBuilder.andWhere("shelf.status != :status", { status: ShelfStatus.DISABLE})
    queryBuilder.andWhere("shelf.name = :name", { name: name?.trim() })
    const res = await queryBuilder.getCount();
    if (res > 0) throw new RpcException(`This ${name} name already exists`);
  }

}
