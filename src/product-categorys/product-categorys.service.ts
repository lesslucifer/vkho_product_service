import { forwardRef, HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import moment from 'moment';
import { BufferedFile } from 'src/common/buffered-file.dto';
import { ResponseDTO } from 'src/common/response.dto';
import { PRODUCT_CATEGORY_CODE_PATTERN } from 'src/constants/product-category.constants';
import { MasterProductFilter } from 'src/master-products/dto/filter-master-product.dto';
import { MasterProductsService } from 'src/master-products/master-products.service';
import { ParentProductCategorysService } from 'src/parent-product-categorys/parent-product-categorys.service';
import { ProductFilter } from 'src/product/dto/filter-product.dto';
import { ProductService } from 'src/product/product.service';
import { ShelfFilter } from 'src/shelves/dto/filter-shelf.dto';
import { ShelfService } from 'src/shelves/shelf.service';
import { SupplierFilter } from 'src/suppliers/dto/filter-supplier.dto';
import { Supplier } from 'src/suppliers/entities/supplier.entity';
import { SuppliersService } from 'src/suppliers/suppliers.service';
import { Repository } from 'typeorm';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { ProductCategoryFilter } from './dto/filter-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { ProductCategory } from './entities/product-category.entity';
import { ProductCategoryMethod } from './enums/product-category-method';
import { ProductCategoryStatus } from './enums/product-category-status.enum';
import readXlsxFile from 'read-excel-file/node';
import * as fs from 'fs';
import { HttpService } from '@nestjs/axios';
import { parseDate } from 'src/common/partDateTime';

@Injectable()
export class ProductCategorysService {

  private readonly logger = new Logger(ProductCategorysService.name);

  private readonly baseURLPinnow: string;

  constructor(
    @InjectRepository(ProductCategory)
    private productCategoryRepository: Repository<ProductCategory>,
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
    @Inject(forwardRef(() => ParentProductCategorysService))
    private readonly parentProductCategorysService: ParentProductCategorysService,
    private httpService: HttpService,
  ) { this.baseURLPinnow = process.env.BASE_URL_PINNOW }

  async create(createProductCategoryDto: CreateProductCategoryDto) {
    this.logger.log(`Request to save Product Category: ${createProductCategoryDto.name}`);
    //this.validateInputs(createProductCategoryDto);
    //await this.checkNameProductCategory(createProductCategoryDto.name, createProductCategoryDto.warehouseId);
    const newProductCategory = await this.productCategoryRepository.create(createProductCategoryDto);
    if (createProductCategoryDto.parentProductCategoryId)
      newProductCategory.parentProductCategory = await this.parentProductCategorysService.findOne(createProductCategoryDto?.parentProductCategoryId);
    const res = await this.productCategoryRepository.save(newProductCategory);

    const codeParent = newProductCategory?.parentProductCategory?.code ? newProductCategory?.parentProductCategory?.code : "";

    const count = await this.countDivision(codeParent);
    if (count + 1 < 10) res.code = codeParent + "0" + Number(count + 1);
    else res.code = codeParent + "" + Number(count + 1);

    await this.productCategoryRepository.update(res.id, res);
    const updateProductCategory = await this.productCategoryRepository.findOne(res.id);
    if (updateProductCategory) {
      const data = await this.syncDataPinnow(
        {
          code: updateProductCategory.code, 
          name: updateProductCategory.name,
          parentCode: newProductCategory.parentProductCategory?.code,
          parentName: newProductCategory.parentProductCategory?.name
        });
        
      if (data?.status !== "success") {
        await this.productCategoryRepository.delete(updateProductCategory.id);
        throw new RpcException(data?.message);
      }
    }
    return updateProductCategory;
  }

  async countDivision(code: string) {
    return this.productCategoryRepository.createQueryBuilder("parent")
      .where("parent.code LIKE :code", {code: `${code}%`})
      .getCount();
  }

  async syncDataPinnow(data){
    const url = `${this.baseURLPinnow}/wms/v1/product/sync_update_category`;
    return this.httpService.post(url, data, {
      headers: {
        "ContentType": "application/json",
      },
    }).toPromise().then(res => {
      console.log(res?.data); 
      return res.data;
    });
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
            console.log(row);
            for (const data of row) {
              if (i >= 1) {
                const parent = new CreateProductCategoryDto();
                parent.name = data[0].toString();
                //parent.exportStrategy = data[1].toString();
                parent.parentProductCategoryId = parseInt(data[1].toString());
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

  async findAll(productCategoryFilter: ProductCategoryFilter): Promise<ResponseDTO> {
    this.logger.log(`Request to get all Product Category`);
    const queryBuilder = this.productCategoryRepository.createQueryBuilder("category");

    if (productCategoryFilter.warehouseId) {
      queryBuilder.where("category.warehouseId = :warehouseId", { warehouseId: productCategoryFilter.warehouseId })
    }

    if (productCategoryFilter.productCategoryName) {
      queryBuilder.andWhere("LOWER(category.name) LIKE LOWER(:productCategoryName)", { productCategoryName: `%${productCategoryFilter.productCategoryName}%` })
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
    .leftJoinAndSelect("category.parentProductCategory", "parentProductCategory")
    .leftJoinAndSelect("parentProductCategory.divison", "divison")
    .getManyAndCount();

    const res = new ResponseDTO();
    await data?.then(rs => {
      res.totalItem = rs[1];
      res.data = rs[0];
    });
    return res;
  }

  async findOne(id: number) {
    this.logger.log(`Request to get Product Category: ${id}`);
    const productCategory = await this.productCategoryRepository.findOne(id, {relations: ['parentProductCategory']});
    if (productCategory) {
      return productCategory;
    }
    throw new RpcException('Not found product category');
  }

  async update(id: number, currentProductCategory: UpdateProductCategoryDto) {
    this.logger.log(`Request to update Product Category: ${id}`);
    this.validateInputs(currentProductCategory);
    const beforeUpdate = await this.productCategoryRepository.findOne(id, { relations: ["parentProductCategory"]});
    
    if (currentProductCategory.name && beforeUpdate.name !== currentProductCategory.name) {
      await this.checkNameProductCategory(currentProductCategory.name, currentProductCategory.warehouseId);
    }
    
    if(currentProductCategory.status === ProductCategoryStatus.DISABLE){

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
    if(productMasterTemp?.data?.length > 0) throw new RpcException('Cannot disable!');
    
    let flagShelf = 0;
    const sshelfFilers = new ShelfFilter;
    const shelfTemp = await this.shelfService.findAll(sshelfFilers);
    shelfTemp?.data?.forEach(element => {
      if(element.productCategory && element.productCategory.id == id)
      {
        flagShelf = 1;
      }
    });
    if(flagShelf == 1)
    {
      throw new RpcException('Cannot disable!');
    }
  }
    currentProductCategory.updateDate = parseDate(new Date());

    if (currentProductCategory.parentProductCategoryId)
      currentProductCategory.parentProductCategory = await this.parentProductCategorysService.findOne(currentProductCategory?.parentProductCategoryId);

    delete currentProductCategory.parentProductCategoryId;
    await this.productCategoryRepository.update(id, currentProductCategory);
    const updateProductCategory = await this.productCategoryRepository.findOne(id);
    if (updateProductCategory) {
      if (currentProductCategory.parentProductCategoryId) {
        const data = await this.syncDataPinnow({
          code: updateProductCategory.code, 
          name: updateProductCategory.name,
          parentCode: currentProductCategory.parentProductCategory?.code,
          parentName: currentProductCategory.parentProductCategory?.name});

          if (data?.status !== "success") {
            await this.productCategoryRepository.save(beforeUpdate);
            throw new RpcException(data?.message);
          }
      } else {
        const data = await this.syncDataPinnow({
          code: updateProductCategory.code, 
          name: updateProductCategory.name,
          parentCode: beforeUpdate.parentProductCategory?.code,
          parentName: beforeUpdate.parentProductCategory?.name});
         
        if (data?.status !== "success") {
          await this.productCategoryRepository.save(beforeUpdate);
          throw new RpcException(data?.message);
        }
      }
      
      
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

    const deleteResponse = await this.productCategoryRepository.findOne(id);
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
    deleteResponse.status = ProductCategoryStatus.DISABLE;
    this.productCategoryRepository.save(deleteResponse);
  }

  validateInputs(cate) {

    if (cate.exportStrategy) {
      if (!Object.values(ProductCategoryMethod).includes(cate.exportStrategy))
        throw new RpcException('Export strategy incorrect!');
    }
    
  }

  async checkNameProductCategory(name: string, warehouseId: number) {
    const queryBuilder = this.productCategoryRepository.createQueryBuilder("cate");
    queryBuilder.where("cate.warehouseId = :warehouseId", { warehouseId: warehouseId })
    queryBuilder.andWhere("cate.status != :status", { status: ProductCategoryStatus.DISABLE})
    queryBuilder.andWhere("cate.name = :name", { name: name?.trim() })
    const res = await queryBuilder.getCount();
    if (res > 0) throw new RpcException(`This ${name} name already exists`);
  }

}
