import { forwardRef, HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import moment from 'moment';
import { BufferedFile } from 'src/common/buffered-file.dto';
import { ResponseDTO } from 'src/common/response.dto';
import { PARENT_PRODUCT_CATEGORY_CODE_PATTERN } from 'src/constants/parent-product-category.constants';
import { DivisonService } from 'src/divison/divison.service';
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
import { CreateParentProductCategoryDto } from './dto/create-parent-product-category.dto';
import { ParentProductCategoryFilter } from './dto/filter-parent-product-category.dto';
import { UpdateParentProductCategoryDto } from './dto/update-parent-product-category.dto';
import { ParentProductCategory } from './entities/parent-product-category.entity';
import { ParentProductCategoryStatus } from './enums/parent-product-category-status.enum';
import readXlsxFile from 'read-excel-file/node';
import * as fs from 'fs';
import { parseDate } from 'src/common/partDateTime';

@Injectable()
export class ParentProductCategorysService {

  private readonly logger = new Logger(ParentProductCategorysService.name);

  constructor(
    @InjectRepository(ParentProductCategory)
    private parentProductCategoryRepository: Repository<ParentProductCategory>,
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
    @Inject(forwardRef(() => DivisonService))
    private readonly divisonService: DivisonService,

  ) { }

  async create(createParentProductCategoryDto: CreateParentProductCategoryDto) {
    this.logger.log(`Request to save Parent Product Category: ${createParentProductCategoryDto.name}`);
    //await this.checkNameProductCategory(createParentProductCategoryDto.name, createParentProductCategoryDto.warehouseId);
    const newProductCategory = await this.parentProductCategoryRepository.create(createParentProductCategoryDto);
    if (createParentProductCategoryDto.divisonId)
      newProductCategory.divison = await this.divisonService.findOne(createParentProductCategoryDto?.divisonId);
    const res = await this.parentProductCategoryRepository.save(newProductCategory);

    const codeDivison = newProductCategory?.divison?.code ? newProductCategory?.divison?.code : "";

    const count = await this.countDivision(codeDivison);
    if (count + 1 < 10) res.code = codeDivison + "0" + Number(count + 1);
    else res.code = codeDivison + "" + Number(count + 1);

    await this.parentProductCategoryRepository.update(res.id, res);
    const updateProductCategory = await this.parentProductCategoryRepository.findOne(res.id);
    return updateProductCategory;
  }

  async countDivision(code: string) {
    return this.parentProductCategoryRepository.createQueryBuilder("parent")
      .where("parent.code LIKE :code", {code: `${code}%`})
      .getCount();
  }

  async createExcel(createDivisonDto: BufferedFile) {
    this.logger.log(`Request to save parent product through excel`);
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
                const parent = new CreateParentProductCategoryDto();
                parent.name = data[0].toString();
                parent.exportStrategy = data[1].toString();
                parent.divisonId = parseInt(data[2].toString());
                parent.warehouseId = dataExcel.warehouseId;
                res.push(await this.create(parent));
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

  async findAll(productCategoryFilter: ParentProductCategoryFilter): Promise<ResponseDTO> {
    this.logger.log(`Request to get all Parent Product Category`);
    const queryBuilder = this.parentProductCategoryRepository.createQueryBuilder("category");

    if (productCategoryFilter.warehouseId) {
      queryBuilder.where("category.warehouseId = :warehouseId", { warehouseId: productCategoryFilter.warehouseId })
    }

    if (productCategoryFilter.parentProductCategoryName) {
      queryBuilder.andWhere("category.name LIKE :productCategoryName", { productCategoryName: `%${productCategoryFilter.parentProductCategoryName}%` })
    }

    if (productCategoryFilter.status) {
      queryBuilder.andWhere('category.status = :status', { status: productCategoryFilter.status });
    }


    if (productCategoryFilter.startDate && productCategoryFilter.endDate) {
      const startDate = productCategoryFilter.startDate;
      const endDate = productCategoryFilter.endDate;
      queryBuilder.andWhere(`category.createDate BETWEEN '${startDate}' AND '${endDate}'`)
    }

    if (productCategoryFilter.sortBy && productCategoryFilter.sortDirection) {
      if (productCategoryFilter.sortDirection.toUpperCase() === "DESC")
        queryBuilder.orderBy(`category.${productCategoryFilter.sortBy}`, "DESC");
      else queryBuilder.orderBy(`category.${productCategoryFilter.sortBy}`, "ASC");
    } else {
      queryBuilder.orderBy("category.id", "ASC");
    }

    const skippedItems = (productCategoryFilter?.page - 1) * productCategoryFilter?.limit;

    if (!isNaN(skippedItems)) {
      queryBuilder
        .skip(skippedItems)
        .take(productCategoryFilter?.limit)
    }

    const data = queryBuilder
    .leftJoinAndSelect("category.divison", "divison")
    .getManyAndCount();

    const res = new ResponseDTO();
    await data?.then(rs => {
      res.totalItem = rs[1];
      res.data = rs[0];
    });
    return res;
  }

  async findOne(id: number) {
    this.logger.log(`Request to get Parent Product Category: ${id}`);
    const productCategory = await this.parentProductCategoryRepository.findOne(id, { relations: ['divison'] });
    if (productCategory) {
      return productCategory;
    }
    throw new RpcException('Not found product category');
  }

  async update(id: number, currentProductCategory: UpdateParentProductCategoryDto) {
    this.logger.log(`Request to update Product Category: ${id}`);
    const beforeUpdate = await this.parentProductCategoryRepository.findOne(id);
    
    if (currentProductCategory.name && beforeUpdate.name !== currentProductCategory.name) {
      await this.checkNameProductCategory(currentProductCategory.name, currentProductCategory.warehouseId);
    }
    
    currentProductCategory.updateDate = parseDate(new Date());

    if (currentProductCategory.divisonId)
      currentProductCategory.divison = await this.divisonService.findOne(currentProductCategory?.divisonId);

    delete currentProductCategory.divisonId;
    await this.parentProductCategoryRepository.update(id, currentProductCategory);
    const updateProductCategory = await this.parentProductCategoryRepository.findOne(id);
    if (updateProductCategory) {
      return updateProductCategory;
    }
    throw new RpcException('Not found product category');
  }

  async remove(id: number) {
    this.logger.log(`Request to remove Product Category: ${id}`);
    const suppliersFilers = new SupplierFilter;
    const categoryTemp = await this.suppliersService.findAll(suppliersFilers);
    let flag = 0;
    categoryTemp?.data?.forEach(element => {
      if(!element.productCategorys)
      flag = 1;
    });
    if(flag == 1)
    {
      throw new RpcException('Cannot disable!');
    }

    const deleteResponse = await this.parentProductCategoryRepository.findOne(id);
    let masterProductFilters = new MasterProductFilter;
    masterProductFilters.productCategoryId = id;
    const productMasterTemp = await this.masterProductService.findAll(masterProductFilters);
    if(productMasterTemp?.data?.length != 0)
    {
      throw new RpcException('Cannot disable!');
    }
    if (!deleteResponse) {
      throw new RpcException('Not found product category');
    }
    deleteResponse.status = ParentProductCategoryStatus.DISABLE;
    this.parentProductCategoryRepository.save(deleteResponse);
  }


  async checkNameProductCategory(name: string, warehouseId: number) {
    const queryBuilder = this.parentProductCategoryRepository.createQueryBuilder("cate");
    queryBuilder.where("cate.warehouseId = :warehouseId", { warehouseId: warehouseId })
    queryBuilder.andWhere("cate.status != :status", { status: ParentProductCategoryStatus.DISABLE})
    queryBuilder.andWhere("cate.name = :name", { name: name?.trim() })
    const res = await queryBuilder.getCount();
    if (res > 0) throw new RpcException(`This ${name} name already exists`);
  }

}
