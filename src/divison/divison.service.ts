import { forwardRef, HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import moment from 'moment';
import { BufferedFile } from 'src/common/buffered-file.dto';
import { ResponseDTO } from 'src/common/response.dto';
import { DIVISON_CODE_PATTERN } from 'src/constants/divison.constants';
import { PARENT_PRODUCT_CATEGORY_CODE_PATTERN } from 'src/constants/parent-product-category.constants';
import { MasterProductFilter } from 'src/master-products/dto/filter-master-product.dto';
import { MasterProductsService } from 'src/master-products/master-products.service';
import { ProductFilter } from 'src/product/dto/filter-product.dto';
import { ProductService } from 'src/product/product.service';
import { ShelfFilter } from 'src/shelves/dto/filter-shelf.dto';
import { ShelfService } from 'src/shelves/shelf.service';
import { SupplierFilter } from 'src/suppliers/dto/filter-supplier.dto';
import { Supplier } from 'src/suppliers/entities/supplier.entity';
import { SuppliersService } from 'src/suppliers/suppliers.service';
import { Repository } from 'typeorm';
import { CreateDivisonDto } from './dto/create-divison.dto';
import { DivisonFilter } from './dto/filter-divison.dto';
import { Divison } from './entities/divison.entity';
import { DivisonStatus } from './enums/divison-status.enum';
import readXlsxFile from 'read-excel-file/node';
import * as fs from 'fs';
import { parseDate } from 'src/common/partDateTime';

@Injectable()
export class DivisonService {

  private readonly logger = new Logger(DivisonService.name);

  constructor(
    @InjectRepository(Divison)
    private divisonRepository: Repository<Divison>,
    @InjectRepository(Supplier)
    private supplierRepository: Repository<Supplier>,

    @Inject(forwardRef(() => ShelfService))
    private readonly shelfService: ShelfService,
    @Inject(forwardRef(() => MasterProductsService))
    private readonly masterProductService: MasterProductsService,
    @Inject(forwardRef(() => SuppliersService))
    private readonly suppliersService: SuppliersService,
    @Inject(forwardRef(() => ProductService))
    private readonly productService: ProductService,
  ) { }

  async create(createDivisonDto: CreateDivisonDto) {
    this.logger.log(`Request to save Divison: ${createDivisonDto.name}`);
    //await this.checkNameProductCategory(createDivisonDto.name, createDivisonDto.warehouseId);
    const newProductCategory = await this.divisonRepository.create(createDivisonDto);
    const res = await this.divisonRepository.save(newProductCategory);

    if (res.id < 10) res.code = "0" + res.id;
    else res.code = "" + res.id;

    await this.divisonRepository.update(res.id, res);
    const updateProductCategory = await this.divisonRepository.findOne(res.id);
    return updateProductCategory;
  }

  async createExcel(createDivisonDto: BufferedFile) {
    this.logger.log(`Request to save Divison through excel`);
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
                const divison = new CreateDivisonDto();
                divison.name = data[0].toString();
                divison.warehouseId = dataExcel.warehouseId;
                res.push(await this.create(divison));
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



  async findAll(divisonFilter: DivisonFilter): Promise<ResponseDTO> {
    this.logger.log(`Request to get all Divison`);
    const queryBuilder = this.divisonRepository.createQueryBuilder("divison");

    if (divisonFilter.warehouseId) {
      queryBuilder.where("divison.warehouseId = :warehouseId", { warehouseId: divisonFilter.warehouseId })
    }

    if (divisonFilter.divisonName) {
      queryBuilder.andWhere("divison.name LIKE :productCategoryName", { productCategoryName: `%${divisonFilter.divisonName}%` })
    }

    if (divisonFilter.status) {
      queryBuilder.andWhere('divison.status = :status', { status: divisonFilter.status });
    }


    if (divisonFilter.startDate && divisonFilter.endDate) {
      const startDate = divisonFilter.startDate;
      const endDate = divisonFilter.endDate;
      queryBuilder.andWhere(`divison.createDate BETWEEN '${startDate}' AND '${endDate}'`)
    }

    if (divisonFilter.sortBy && divisonFilter.sortDirection) {
      if (divisonFilter.sortDirection.toUpperCase() === "DESC")
        queryBuilder.orderBy(`divison.${divisonFilter.sortBy}`, "DESC");
      else queryBuilder.orderBy(`divison.${divisonFilter.sortBy}`, "ASC");
    } else {
      queryBuilder.orderBy("divison.id", "ASC");
    }

    const skippedItems = (divisonFilter?.page - 1) * divisonFilter?.limit;

    if (!isNaN(skippedItems)) {
      queryBuilder
        .skip(skippedItems)
        .take(divisonFilter?.limit)
    }

    const data = queryBuilder.getManyAndCount();

    const res = new ResponseDTO();
    await data?.then(rs => {
      res.totalItem = rs[1];
      res.data = rs[0];
    });
    return res;
  }

  async findOne(id: number) {
    this.logger.log(`Request to get  divison: ${id}`);
    const productCategory = await this.divisonRepository.findOne(id);
    if (productCategory) {
      return productCategory;
    }
    throw new RpcException('Not found divison');
  }

  async update(id: number, currentProductCategory: Divison) {
    this.logger.log(`Request to update divison: ${id}`);
    const beforeUpdate = await this.divisonRepository.findOne(id);

    if (currentProductCategory.name && beforeUpdate.name !== currentProductCategory.name) {
      await this.checkNameProductCategory(currentProductCategory.name, currentProductCategory.warehouseId);
    }

    if (currentProductCategory.status === DivisonStatus.DISABLE) {

      const productFilter = new ProductFilter();
      productFilter.productCategoryId = id;
      const pros = await this.productService.findAll(productFilter);
      if (pros?.data?.length > 0) throw new RpcException('Because there are still products in warehouse, so it can not switch to disable status');

      const suppliersFilers = new SupplierFilter();
      suppliersFilers.productCategoryId = id;
      const categoryTemp = await this.suppliersService.findAll(suppliersFilers);
      if (categoryTemp?.data?.length > 0) throw new RpcException('Cannot disable!');

      let masterProductFilters = new MasterProductFilter();
      masterProductFilters.productCategoryId = id;
      const productMasterTemp = await this.masterProductService.findAll(masterProductFilters);
      if (productMasterTemp?.data?.length > 0) throw new RpcException('Cannot disable!');

      let flagShelf = 0;
      const sshelfFilers = new ShelfFilter;
      const shelfTemp = await this.shelfService.findAll(sshelfFilers);
      shelfTemp?.data?.forEach(element => {
        if (element.productCategory && element.productCategory.id == id) {
          flagShelf = 1;
        }
      });
      if (flagShelf == 1) {
        throw new RpcException('Cannot disable!');
      }
    }
    currentProductCategory.updateDate = parseDate(new Date());
    await this.divisonRepository.update(id, currentProductCategory);
    const updateProductCategory = await this.divisonRepository.findOne(id);
    if (updateProductCategory) {
      return updateProductCategory;
    }
    throw new RpcException('Not found divison');
  }

  async remove(id: number) {
    this.logger.log(`Request to remove divison: ${id}`);
    const suppliersFilers = new SupplierFilter;
    const categoryTemp = await this.suppliersService.findAll(suppliersFilers);
    let flag = 0;
    categoryTemp?.data?.forEach(element => {
      if (!element.productCategorys)
        flag = 1;
    });
    if (flag == 1) {
      throw new RpcException('Cannot disable!');
    }

    const deleteResponse = await this.divisonRepository.findOne(id);
    let masterProductFilters = new MasterProductFilter;
    masterProductFilters.productCategoryId = id;
    const productMasterTemp = await this.masterProductService.findAll(masterProductFilters);
    if (productMasterTemp?.data?.length != 0) {
      throw new RpcException('Cannot disable!');
    }
    if (!deleteResponse) {
      throw new RpcException('Not found divison');
    }
    deleteResponse.status = DivisonStatus.DISABLE;
    this.divisonRepository.save(deleteResponse);
  }


  async checkNameProductCategory(name: string, warehouseId: number) {
    const queryBuilder = this.divisonRepository.createQueryBuilder("divison");
    queryBuilder.where("divison.warehouseId = :warehouseId", { warehouseId: warehouseId })
    queryBuilder.andWhere("divison.status != :status", { status: DivisonStatus.DISABLE })
    queryBuilder.andWhere("divison.name = :name", { name: name?.trim() })
    const res = await queryBuilder.getCount();
    if (res > 0) throw new RpcException(`This ${name} name already exists`);
  }

}
