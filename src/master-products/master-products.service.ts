import { forwardRef, HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { ResponseDTO } from 'src/common/response.dto';
import { MASTER_PRODUCT_CODE_PATTERN, MASTER_PRODUCT_CODE_PATTERN_NONERESOURCE, MASTER_PRODUCT_CODE_PATTERN_RESOURCE } from 'src/constants/master-product.constants';
import { ProductCategorysService } from 'src/product-categorys/product-categorys.service';
import { ProductFilter } from 'src/product/dto/filter-product.dto';
import { ProductService } from 'src/product/product.service';
import { SuppliersService } from 'src/suppliers/suppliers.service';
import { Repository } from 'typeorm';
import { CreateMasterProductDto } from './dto/create-master-product.dto';
import { MasterProductFilter } from './dto/filter-master-product.dto';
import { UpdateMasterProductDto } from './dto/update-master-product.dto';
import { MasterProduct } from './entities/master-product.entity';
import { MasterProductStatus } from './enums/master-product-status.enum';
import { ConfigService } from '@nestjs/config';
import { MasterProductMethod } from './enums/master-product-method';
import { ProductStatus } from 'src/product/enum/product-status.enum';
import { BufferedFile } from 'src/common/buffered-file.dto';
import readXlsxFile from 'read-excel-file/node';
import * as fs from 'fs';
import { ReplenishmentsService } from 'src/replenishments/replenishments.service';
import { CreateReplenishmentDto } from 'src/replenishments/dto/create-replenishment.dto';
import { HttpService } from '@nestjs/axios';
import { CreateMasterProductDto } from './dto/create-master-product-pinnow.dto';

@Injectable()
export class MasterProductsService {
  private readonly logger = new Logger(MasterProductsService.name);
  private readonly baseURLPinnow: string;

  constructor(
    @InjectRepository(MasterProduct)
    private masterProductRepository: Repository<MasterProduct>,

    @Inject(forwardRef(() => ProductService))
    private readonly productService: ProductService,
    @Inject(forwardRef(() => SuppliersService))
    private readonly suppliersService: SuppliersService,
    @Inject(forwardRef(() => ProductCategorysService))
    private readonly productCategorysService: ProductCategorysService,
    @Inject(forwardRef(() => ReplenishmentsService))
    private readonly replenishmentsService: ReplenishmentsService,
    private configService: ConfigService,
    private httpService: HttpService,
    
  ) { this.baseURLPinnow = process.env.BASE_URL_PINNOW }

  async create(createMasterProductDto: CreateMasterProductDto) {
    this.logger.log(`Request to save MasterProduct`);
    this.validateInputs(createMasterProductDto);
    
    const count = await this.countCodeResource(createMasterProductDto.isResources);
    if (createMasterProductDto.isResources) 
      createMasterProductDto.code = (Number(MASTER_PRODUCT_CODE_PATTERN_RESOURCE) + count).toString();
    else 
      createMasterProductDto.code = (Number(MASTER_PRODUCT_CODE_PATTERN_NONERESOURCE) + count).toString();

    if (!createMasterProductDto.barCode) createMasterProductDto.barCode = createMasterProductDto.code;
    await this.checkBarCode(createMasterProductDto.barCode, createMasterProductDto.warehouseId);

    const newMasterProduct = this.masterProductRepository.create(createMasterProductDto);
    
    if (createMasterProductDto.productCategoryId)
      newMasterProduct.productCategory = await this.productCategorysService.findOne(createMasterProductDto?.productCategoryId);

    const res = await this.masterProductRepository.save(newMasterProduct);

    let suppliers = [];
    if (createMasterProductDto?.supplierIds?.length > 0) {
      for (const sup of createMasterProductDto.supplierIds) {
        const supplier = await this.suppliersService.findOne(sup);
        if (supplier) {
          suppliers.push(supplier);
        }
      }
    }
    res.suppliers = suppliers;
    

    await this.masterProductRepository.save(res);
    const master = await this.masterProductRepository.findOne(res.id, { relations: ['suppliers', 'productCategory']});
    if (master) {
      const create = new CreateMasterProductDto();
      create.code = master.code;
      create.categoryCode = master?.productCategory?.code;
      create.name = master.name;
      create.package = master.packing; 
      create.photo = master.image;
      create.price = master.retailPrice;
      create.productSkuCode = master.barCode;
      create.unitCode = master.DVT;
      create.wholesalePrice = master.salePrice;
      create.wholesaleQuantity = 0;
      create.availableQuantity = master.availableQuantity;
      create.description = master.description;
      create.active = true;
      await this.timeout(1000);
      const data = await this.syncDataPinnow(create);
      if (data?.status !== "success") {
        await this.masterProductRepository.delete(master.id);
        throw new RpcException(data?.message);
      }
    }
    return master;
  }

  timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async countCodeResource(isResources: boolean){
    return await this.masterProductRepository.createQueryBuilder("master")
    .where("master.isResources = :isResources", {isResources: isResources})
    .getCount();
  }

  async syncDataPinnow(data: CreateMasterProductDto){
    const url = `${this.baseURLPinnow}/wms/v1/product/sync_update_product`;
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
    this.logger.log(`Request to save master through excel`);
    return await this.readExcel(createDivisonDto);
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
                const master = new CreateMasterProductDto();

                if(data[0])
                  master.itemCode = data[0].toString();

                if(data[1])
                  master.barCode = data[1].toString();

                if(data[2])
                  master.name = data[2].toString();

                if (data[3])
                  master.productCategoryId = parseInt(data[3].toString());

                if (data[5])
                  master.capacity = parseInt(data[5].toString());

                if (data[6])
                  master.stogareTime = parseInt(data[6].toString());

                if (data[7])
                  master.DVT = data[7].toString();

                if (data[8])
                  master.VAT = Number(data[8].toString())* 100;

                if (data[9])
                  master.purchasePrice = parseInt(data[9].toString());

                if (data[10])
                  master.retailPrice = parseInt(data[10].toString());

                if (data[11])
                  master.salePrice = parseInt(data[11].toString());

                if(data[12])
                 master.supplierIds = data[12].toString().split(",").map(x=>+x);

                if(data[16])
                 master.packing = data[16].toString();
                
                if(data[17])
                 master.length = parseInt(data[17].toString());

                if(data[18])
                 master.width = parseInt(data[18].toString());

                if(data[19])
                 master.height = parseInt(data[19].toString());

                if(data[20])
                 master.isActive = true;
                else master.isActive = false;

                if(data[21])
                 master.discount = parseInt(data[21].toString());

                if(data[22])
                 master.isResources = true;
                else master.isResources = false;

                if(data[23])
                 master.image = data[23].toString();

                if(data[24])
                 master.description = data[24].toString();

                master.warehouseId = dataExcel.warehouseId;
                const masterItem = await this.create(master);

                if(data[14] && data[15]) {
                  const replenishment = new CreateReplenishmentDto();
                  replenishment.max = parseInt(data[14].toString());
                  replenishment.min = parseInt(data[15].toString());
                  replenishment.warehouseId = dataExcel.warehouseId;
                  replenishment.masterProductId = masterItem.id;
                  replenishment.productName = masterItem.name;
                  replenishment.productCategoryId = master.productCategoryId;
                  await this.replenishmentsService.create(replenishment);
                }
                res.push(masterItem);
              }
              i++;
            }
          })
          .then(() => {
            fs.unlink(filename, (err) => {
              if (err) console.log(err);
            });
          }).catch(err => {
            console.log(err);
          })
      }
    });
    return res;
  }

  async findAll(masterProductFilter: MasterProductFilter): Promise<ResponseDTO> {
    this.logger.log(`Request to get all Master Product`);
    const queryBuilder = this.masterProductRepository.createQueryBuilder("master");

    if (masterProductFilter.warehouseId) {
      queryBuilder.where("master.warehouseId = :warehouseId", { warehouseId: masterProductFilter.warehouseId })
    }

    if (masterProductFilter.productCategoryId) {
      queryBuilder.andWhere("master.productCategoryId = :productCategoryId", { productCategoryId: masterProductFilter.productCategoryId })
    }

    if (masterProductFilter.barCodes) {
      const barCodes = masterProductFilter.barCodes.split(",");
      queryBuilder.andWhere("master.barCode IN (:...barCodes)", { barCodes: barCodes })
    }

    if (masterProductFilter.barCode) {
      queryBuilder.andWhere("master.barCode = :barCode", { barCode: masterProductFilter.barCode })
    }

    // if (masterProductFilter.supplierId) {
    //   queryBuilder.andWhere("master.supplierId = :supplierId", { supplierId: masterProductFilter.supplierId })
    // }

    if (masterProductFilter.masterProductCode) {
      queryBuilder.andWhere("master.code = :masterProductCode", { masterProductCode: masterProductFilter.masterProductCode })
    }

    if (masterProductFilter.masterProductName) {
      queryBuilder.andWhere("master.name LIKE :masterProductName", { masterProductName: `%${masterProductFilter.masterProductName}%` })
    }

    if (masterProductFilter.status) {
      queryBuilder.andWhere('master.status = :status', { status: masterProductFilter.status });
    }

    if (masterProductFilter.startDate && masterProductFilter.endDate) {
      const startDate = masterProductFilter.startDate;
      const endDate = masterProductFilter.endDate;
      queryBuilder.andWhere(`master.createDate BETWEEN '${startDate}' AND '${endDate}'`)
    }

    if (masterProductFilter.sortBy && masterProductFilter.sortDirection) {
      if (masterProductFilter.sortDirection.toUpperCase() === "DESC")
        queryBuilder.orderBy(`master.${masterProductFilter.sortBy}`, "DESC");
      else queryBuilder.orderBy(`master.${masterProductFilter.sortBy}`, "ASC");
    } else {
      queryBuilder.orderBy("master.id", "ASC");
    }

    const skippedItems = (masterProductFilter?.page - 1) * masterProductFilter?.limit;

    if (!isNaN(skippedItems)) {
      queryBuilder
        .skip(skippedItems)
        .take(masterProductFilter?.limit)
    }

    const data = queryBuilder
      .leftJoinAndSelect('master.productCategory', 'productCategory')
      .leftJoinAndSelect('productCategory.parentProductCategory', 'parentProductCategory')
      .leftJoinAndSelect('master.suppliers', 'suppliers')
      .leftJoinAndSelect('master.replenishments', 'replenishments')
      .getManyAndCount();

    if (masterProductFilter.isNoneReplenishment) {
      const res = new ResponseDTO();
      const masters = [];
      await data?.then(rs => {
        res.totalItem = rs[1];
        res.data = rs[0];
      });
      for (const master of res?.data) {
        if (master.replenishments?.length === 0) {
          masters.push(master);
        }
      }
      res.data = masters;
      return res;
    }

    const res = new ResponseDTO();
    await data?.then(rs => {
      res.totalItem = rs[1];
      res.data = rs[0];
    });
    return res;
  }

  async findOne(id: number) {
    this.logger.log(`Request to get MasterProduct: ${id}`);
    const masterProductExist = await this.masterProductRepository.findOne(id, { relations: ['productCategory', 'suppliers'] });
    if (masterProductExist) {
      return masterProductExist;
    }
    throw new RpcException('Not found MasterProduct');
  }

  async findByBarcode(barCode: string) {
    this.logger.log(`Request to get MasterProduct by barcode: ${barCode}`);
    const masterProductExist = await this.masterProductRepository.findOne({where: { barCode: barCode }, relations: ['productCategory', 'suppliers'] });
    if (masterProductExist) {
      return masterProductExist;
    }
    throw new RpcException('Not found MasterProduct');
  }

  async update(id: number, currentMasterProduct: UpdateMasterProductDto) {
    this.logger.log(`Request to update MasterProduct: ${id}`);

    this.validateInputs(currentMasterProduct);
    const beforeUpdate = await this.masterProductRepository.findOne(id, { relations: ["productCategory", "suppliers"] });

    // if (currentMasterProduct.name && beforeUpdate.name !== currentMasterProduct.name) {
    //   await this.checkNameProduct(currentMasterProduct.name, currentMasterProduct.warehouseId);
    // }

    if (currentMasterProduct.barCode && beforeUpdate.barCode !== currentMasterProduct.barCode) {
      await this.checkBarCode(currentMasterProduct.barCode, currentMasterProduct.warehouseId);
    }

    let suppliers = [];
    if (currentMasterProduct?.supplierIds?.length > 0) {
      for (const sup of currentMasterProduct.supplierIds) {
        const supplier = await this.suppliersService.findOne(sup);
        if (supplier) {
          suppliers.push(supplier);
        }
      }
    }
    currentMasterProduct.suppliers = suppliers;

    if (currentMasterProduct.productCategoryId)
      currentMasterProduct.productCategory = await this.productCategorysService.findOne(currentMasterProduct?.productCategoryId);
    if (currentMasterProduct.status === "DISABLE") {
      var productFilter = new ProductFilter;
      productFilter.masterProductId = currentMasterProduct.id;
      const products = await this.productService.findAll(productFilter);
      if (products?.data?.length > 0) {
        throw new RpcException('Because there are still products in warehouse, so it can not switch to disable status');
      }
    }
    delete currentMasterProduct.productCategoryId;
    delete currentMasterProduct.supplierIds;

    await this.masterProductRepository.save(currentMasterProduct);
    const updateMasterProduct = await this.masterProductRepository.findOne(id, { relations: ["productCategory", "suppliers"] });
    if (updateMasterProduct) {
      
      const create = new CreateMasterProductDto();
      create.code = updateMasterProduct.code;
      create.categoryCode = updateMasterProduct?.productCategory?.code;
      create.name = updateMasterProduct.name;
      create.package = updateMasterProduct.packing; 
      create.photo = updateMasterProduct.image;
      create.price = updateMasterProduct.retailPrice;
      create.productSkuCode = updateMasterProduct.barCode;
      create.unitCode = updateMasterProduct.DVT;
      create.wholesalePrice = updateMasterProduct.salePrice;
      create.wholesaleQuantity = 0;
      create.availableQuantity = updateMasterProduct.availableQuantity;
      create.description = updateMasterProduct.description;
      if (updateMasterProduct.status === MasterProductStatus.DISABLE) create.active = false;
      else create.active = true;
      await this.timeout(1000);
      const data = await this.syncDataPinnow(create);
      if (data?.status !== "success") {
        await this.masterProductRepository.save(beforeUpdate);
        throw new RpcException(data?.message);
      }
      return updateMasterProduct;
    }
    throw new RpcException('Not found MasterProduct');
  }

  async remove(id: number) {
    this.logger.log(`Request to remove MasterProduct: ${id}`);
    const deleteResponse = await this.masterProductRepository.delete(id);
    if (!deleteResponse.affected) {
      throw new RpcException('Not found MasterProduct');
    }
  }

  validateInputs(currentMasterProduct) {

    // if (currentMasterProduct?.method) {
    //   if (!Object.values(MasterProductMethod).includes(currentMasterProduct?.method))
    //     throw new RpcException('Method incorrect!');
    // }

    // if (currentMasterProduct.capacity) {
    //   if (currentMasterProduct.capacity < 0) throw new RpcException('Capacity incorrect!');
    // }

    // if (currentMasterProduct.stogareTime) {
    //   if (currentMasterProduct.stogareTime < 0) throw new RpcException('Stogare time incorrect!');
    // }
    if (!currentMasterProduct.packing) throw new RpcException('Packing is required');
  }

  async checkNameProduct(name: string, warehouseId: number) {
    const queryBuilder = this.masterProductRepository.createQueryBuilder("cate");
    queryBuilder.where("cate.warehouseId = :warehouseId", { warehouseId: warehouseId })
    queryBuilder.andWhere("cate.status != :status", { status: ProductStatus.DISABLE})
    queryBuilder.andWhere("cate.name = :name", { name: name?.trim() })
    const res = await queryBuilder.getCount();
    if (res > 0) throw new RpcException(`This ${name} name already exists`);
  }

  async checkBarCode(barCode: string, warehouseId: number) {
    const queryBuilder = this.masterProductRepository.createQueryBuilder("cate");
    queryBuilder.where("cate.warehouseId = :warehouseId", { warehouseId: warehouseId })
    queryBuilder.andWhere("cate.status != :status", { status: ProductStatus.DISABLE})
    queryBuilder.andWhere("cate.barCode = :barCode", { barCode: barCode })
    const res = await queryBuilder.getCount();
    if (res > 0) throw new RpcException(`This ${barCode} barCode already exists`);
  }

}
