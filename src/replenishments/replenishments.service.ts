import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { ResponseDTO } from 'src/common/response.dto';
import { MasterProductsService } from 'src/master-products/master-products.service';
import { ProductCategorysService } from 'src/product-categorys/product-categorys.service';
import { ProductService } from 'src/product/product.service';
import { Repository } from 'typeorm';
import { CreateReplenishmentDto } from './dto/create-replenishment.dto';
import { ReplenishmentFilter } from './dto/filter-replenishment.dto';
import { ReplenishmentDTO } from './dto/response-replenishment.dto';
import { UpdateReplenishmentDto } from './dto/update-replenishment.dto';
import { Replenishment } from './entities/replenishment.entity';
import { ReplenishmentStatus } from './enums/replenishment-status.enum';

@Injectable()
export class ReplenishmentsService {

  private readonly logger = new Logger(ReplenishmentsService.name);

  constructor(
    @InjectRepository(Replenishment)
    private replenishmentRepository: Repository<Replenishment>,
    @Inject(forwardRef(() => ProductCategorysService))
    private readonly productCategorysService: ProductCategorysService,
    @Inject(forwardRef(() => ProductService))
    private readonly productService: ProductService,
    @Inject(forwardRef(() => MasterProductsService))
    private readonly masterProductService: MasterProductsService,
  ) { }

  async create(createReplenishmentDto: CreateReplenishmentDto) {
    this.logger.log(`Request to save Replenishment: ${createReplenishmentDto.productName}`);
    await this.checkNameReplenishment(createReplenishmentDto.productName, createReplenishmentDto.warehouseId);
    const newReplenishment = await this.replenishmentRepository.create(createReplenishmentDto);

    if (createReplenishmentDto.productCategoryId)
      newReplenishment.productCategory = await this.productCategorysService.findOne(createReplenishmentDto.productCategoryId);
    if (createReplenishmentDto.masterProductId)
      newReplenishment.masterProduct = await this.masterProductService.findOne(createReplenishmentDto.masterProductId);

    await this.replenishmentRepository.save(newReplenishment);
    return newReplenishment;
  }

  async findAll(replenishmentFilter: ReplenishmentFilter): Promise<ResponseDTO> {
    this.logger.log(`Request to get all Replenishment`);
    const queryBuilder = this.replenishmentRepository.createQueryBuilder("rep");

    if (replenishmentFilter.warehouseId) {
      queryBuilder.where("rep.warehouseId = :warehouseId", { warehouseId: replenishmentFilter.warehouseId })
    }

    // if (replenishmentFilter.productName) {
    //     queryBuilder.leftJoinAndSelect('rep.masterProduct','masterproduct1')
    //     .andWhere("masterProduct1.id LIKE :keyword", { keyword: `%${replenishmentFilter.productName}%` })
    // }

    if (replenishmentFilter.productName) {
      queryBuilder.andWhere("rep.productName LIKE :productName", { productName: `${replenishmentFilter.productName}%` })
    }

    if (replenishmentFilter.masterProductId) {
      queryBuilder.leftJoinAndSelect('rep.masterProduct','masterproduct1')
        .andWhere("masterProduct1.id = :masterProductId", { masterProductId: replenishmentFilter.masterProductId })
    }

    if (replenishmentFilter.productCategoryId) {
      queryBuilder.andWhere("rep.productCategoryId = :productCategoryId", { productCategoryId: replenishmentFilter.productCategoryId })
    }

    if (replenishmentFilter.status)
      queryBuilder.andWhere('rep.status = :status', { status: replenishmentFilter.status });
    else
      queryBuilder.andWhere('rep.status IN (:...status)', { status: [ReplenishmentStatus.DISABLE, ReplenishmentStatus.ENABLE] });

    if (replenishmentFilter.startDate && replenishmentFilter.endDate) {
      const startDate = replenishmentFilter.startDate;
      const endDate = replenishmentFilter.endDate;
      queryBuilder.andWhere(`rep.createDate BETWEEN '${startDate}' AND '${endDate}'`)
    }

    if (replenishmentFilter.sortBy && replenishmentFilter.sortDirection) {
      if (replenishmentFilter.sortDirection.toUpperCase() === "DESC")
        queryBuilder.orderBy(`rep.${replenishmentFilter.sortBy}`, "DESC");
      else queryBuilder.orderBy(`rep.${replenishmentFilter.sortBy}`, "ASC");
    } else {
      queryBuilder.orderBy("rep.id", "ASC");
    }

    const skippedItems = (replenishmentFilter?.page - 1) * replenishmentFilter?.limit;

    if (!isNaN(skippedItems)) {
      queryBuilder
        .skip(skippedItems)
        .take(replenishmentFilter?.limit)
    }

    const data = queryBuilder
      .leftJoinAndSelect("rep.productCategory", "productCategory")
      .leftJoinAndSelect('rep.masterProduct', 'masterProduct')
      .leftJoinAndSelect('masterProduct.suppliers', 'suppliers')
      .getManyAndCount();

    const resList = [];
    let reps;
    await data?.then(rs => { reps = rs[0] });

    if (data)
      for (const rep of reps) {
        let dto = new ReplenishmentDTO();
        dto = Object.assign(dto, rep);
        const onHand = await this.productService.getOnHandProductId(rep?.masterProduct?.id, rep?.warehouseId);
        dto.onHand = Number(onHand?.value);

        const onHandTotal = Number(onHand?.value);

        if (dto.max >= onHandTotal && onHandTotal < dto.min)
          dto.toOrder = dto.max - onHandTotal;
        
        if (onHandTotal >= dto.min)
          dto.toOrder = 0;

        resList.push(dto);
      }

    const res = new ResponseDTO();
    await data?.then(rs => {
      res.totalItem = rs[1];
      res.data = resList;
    });
    return res;
  }

  async findOne(id: number) {
    this.logger.log(`Request to get Replenishment: ${id}`);
    const Replenishment = await this.replenishmentRepository.findOne(id);
    if (Replenishment) {
      return Replenishment;
    }
    throw new RpcException('Not found Replenishment');
  }

  async update(id: number, currentReplenishment: UpdateReplenishmentDto) {
    this.logger.log(`Request to update Replenishment: ${id}`);
    this.validateInputs(currentReplenishment);

    const before = await this.replenishmentRepository.findOne(id);
    if (currentReplenishment.productName && before.productName !== currentReplenishment.productName) {
      await this.checkNameReplenishment(currentReplenishment.productName, currentReplenishment.warehouseId);
    }
    
    const updateRe = { ...currentReplenishment }
    delete updateRe.productCategoryId;
    delete updateRe.masterProductId;

    if (currentReplenishment.productCategoryId)
      updateRe.productCategory = await this.productCategorysService.findOne(currentReplenishment.productCategoryId);

    if (currentReplenishment.masterProductId)
      updateRe.masterProduct = await this.masterProductService.findOne(currentReplenishment.masterProductId);

    await this.replenishmentRepository.update(id, updateRe);
    const updateReplenishment = await this.replenishmentRepository.findOne(id, { relations: ['productCategory','masterProduct']});
    if (updateReplenishment) {
      return updateReplenishment;
    }
    throw new RpcException('Not found Replenishment');
  }

  async remove(id: number) {
    this.logger.log(`Request to remove Replenishment: ${id}`);

    const deleteResponse = await this.replenishmentRepository.findOne(id);
    if (!deleteResponse) {
      throw new RpcException('Not found Replenishment');
    }
    deleteResponse.status = ReplenishmentStatus.DISABLE;
    this.replenishmentRepository.save(deleteResponse);
  }

  validateInputs(rep) {

    if (rep.status) {
      if (!Object.values(ReplenishmentStatus).includes(rep.status))
        throw new RpcException('Status incorrect!');
    }
    
  }

  async checkNameReplenishment(name: string, warehouseId: number) {
    const queryBuilder = this.replenishmentRepository.createQueryBuilder("sup");
    queryBuilder.where("sup.warehouseId = :warehouseId", { warehouseId: warehouseId })
    queryBuilder.andWhere("sup.status != :status", { status: ReplenishmentStatus.DISABLE})
    queryBuilder.andWhere("sup.productName = :name", { name: name?.trim() })
    const res = await queryBuilder.getCount();
    if (res > 0) throw new RpcException(`This ${name} name already exists`);
  }
}
