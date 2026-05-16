import { HttpService } from '@nestjs/axios';
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import readXlsxFile from 'read-excel-file/node';
import { BufferedFile } from 'src/common/buffered-file.dto';
import { ResponseDTO } from 'src/common/response.dto';
import { DATA_STILL_IN_WAREHOUSE } from 'src/constants/delete-error.constants';
import { MASTER_PRODUCT_CODE_PATTERN_NONERESOURCE, MASTER_PRODUCT_CODE_PATTERN_RESOURCE } from 'src/constants/master-product.constants';
import { ProductCategorysService } from 'src/product-categorys/product-categorys.service';
import { ProductFilter } from 'src/product/dto/filter-product.dto';
import { ProductStatus } from 'src/product/enum/product-status.enum';
import { ProductService } from 'src/product/product.service';
import { CreateReplenishmentDto } from 'src/replenishments/dto/create-replenishment.dto';
import { ReplenishmentsService } from 'src/replenishments/replenishments.service';
import { SuppliersService } from 'src/suppliers/suppliers.service';
import { Repository } from 'typeorm';
import { CreateMasterProductDto } from './dto/create-master-product.dto';
import { MasterProductFilter } from './dto/filter-master-product.dto';
import { UpdateMasterProductDto } from './dto/update-master-product.dto';
import { MasterProduct } from './entities/master-product.entity';
import { MasterProductStatus } from './enums/master-product-status.enum';
import { CreatePinnowMasterProductDto } from './dto/create-master-product-pinnow.dto';
import { QueryFailedError } from 'typeorm';
import { MasterProductMethod } from './enums/master-product-method';
import { InputValidator } from 'src/common/validators/input-validator';
import { WarehouseGroupService } from 'src/warehouse-group/warehouse-group.service';
import { WarehouseService } from 'src/warehouse/warehouse.service';

@Injectable()
export class MasterProductsService {
  private readonly logger = new Logger(MasterProductsService.name);
  private readonly validator = InputValidator.getInstance();

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
    @Inject(forwardRef(() => WarehouseGroupService))
    private readonly warehouseGroupService: WarehouseGroupService,
    @Inject(forwardRef(() => WarehouseService))
    private readonly warehouseService: WarehouseService,
    private configService: ConfigService,
  ) {}

  async create(createMasterProductDto: CreateMasterProductDto) {
    this.logger.log(`Request to save MasterProduct`);
    
    // Trim string fields
    this.validator.trimStringFields(createMasterProductDto, [
      'name', 'packing', 'DVT', 'barCode', 'itemCode', 'description'
    ]);

    this.validateInputs(createMasterProductDto);
    
    try {
      createMasterProductDto.code = await this.generateMasterProductCode(createMasterProductDto.warehouseId);

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
      return master;
    } catch (error) {
      if (error instanceof QueryFailedError) {
        // Handle specific database constraint violations
        if (error.message.includes('violates not-null constraint')) {
          const column = error.message.match(/column "(\w+)"/)?.[1];
          throw new RpcException({
            status: 400,
            message: `The field '${column}' is required and cannot be null`,
            error: 'Bad Request'
          });
        }
      }
      // For other errors, throw a generic error
      throw new RpcException({
        status: 500,
        message: error.message || 'An error occurred while creating the master product',
        error: 'Internal Server Error'
      });
    }
  }

  async timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async countCodeResource(){
    return await this.masterProductRepository.createQueryBuilder("master")
    .getCount();
  }

  async getWhGroup(warehouseId: number): Promise<any> {
    this.logger.log(`Request to get warehouse group for warehouse: ${warehouseId}`);
    
    try {
      // First, get the warehouse to find its warehouseGroupId
      const warehouse = await this.warehouseService.findOne(warehouseId);
      
      if (!warehouse || !warehouse.warehouseGroupId) {
        this.logger.log(`No warehouse group found for warehouse: ${warehouseId}`);
        return null;
      }
      
      // Get the warehouse group by ID
      const warehouseGroup = await this.warehouseGroupService.findOne(warehouse.warehouseGroupId);
      
      this.logger.log(`Found warehouse group: ${warehouseGroup.name} for warehouse: ${warehouseId}`);
      return warehouseGroup;
      
    } catch (error) {
      this.logger.error(`Error getting warehouse group for warehouse ${warehouseId}:`, error.message);
      return null;
    }
  }

  async generateMasterProductCode(warehouseId: number): Promise<string> {
    const whGroup = await this.getWhGroup(warehouseId);

    if (!whGroup) {
      const count = await this.countCodeResource();
      return (10000000 + count).toString();
    }

    // When warehouse group exists, use format: {warehouseGroupCode}_incremental_number
    const count = await this.countCodeResource();
    const incrementalNumber = Number(MASTER_PRODUCT_CODE_PATTERN_RESOURCE) + count;
    return `${whGroup.code}_${incrementalNumber}`;
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

    if(masterProductFilter.masterProductId) {
      queryBuilder.where("master.id = :masterProductId", { masterProductId: masterProductFilter.masterProductId })
    }

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
      return updateMasterProduct;
    }
    throw new RpcException('Not found MasterProduct');
  }

  async remove(id: number) {
    this.logger.log(`Request to remove MasterProduct: ${id}`);
    const productFilter = new ProductFilter();
    productFilter.masterProductId = id;
    const linkedProducts = await this.productService.findAll(productFilter);
    if (linkedProducts?.data?.length > 0) {
      throw new RpcException(DATA_STILL_IN_WAREHOUSE);
    }
    const deleteResponse = await this.masterProductRepository.delete(id);
    if (!deleteResponse.affected) {
      throw new RpcException('Not found MasterProduct');
    }
  }

  validateInputs(currentMasterProduct) {
    // Validate string fields
    this.validator.validateStringFields(currentMasterProduct, [
      { field: 'name', message: 'Name cannot be empty', required: true },
      { field: 'packing', message: 'Packing cannot be empty', required: true }
    ]);

    // Validate numeric fields
    this.validator.validateNumericFields(currentMasterProduct, [
      { field: 'capacity', min: 0, message: 'Capacity cannot be negative', required: true },
      { field: 'warehouseId', min: 0, message: 'Warehouse ID cannot be negative', required: true },
      { field: 'stogareTime', min: 0, message: 'Storage time cannot be negative' }
    ]);

    // Validate enum fields
    this.validator.validateEnumFields(currentMasterProduct, [
      { field: 'method', enum: MasterProductMethod, message: 'Invalid method' }
    ]);

    // Validate date fields
    this.validator.validateDateFields(currentMasterProduct, [
      { field: 'createdAt', required: false },
      { field: 'updatedAt', required: false }
    ]);
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

  async getAvailableQuantity(masterProductId: number): Promise<{ availableQuantity: number }> {
    this.logger.log(`Request to get available quantity for MasterProduct: ${masterProductId}`);

    const masterProduct = await this.masterProductRepository.findOne(masterProductId);

    if (!masterProduct) {
      throw new RpcException('Master product not found');
    }

    const queryBuilder = this.productService['productRepository'].createQueryBuilder('product');

    const result = await queryBuilder
      .select('SUM(product.totalQuantity)', 'totalAvailable')
      .where('product.masterProductId = :masterProductId', { masterProductId })
      .andWhere('product.status = :status', { status: ProductStatus.STORED })
      .andWhere('product.warehouseId = :warehouseId', { warehouseId: masterProduct.warehouseId })
      .getRawOne();

    const availableQuantity = parseInt(result?.totalAvailable) || 0;

    if (masterProduct.availableQuantity !== availableQuantity) {
      masterProduct.availableQuantity = availableQuantity;
      await this.masterProductRepository.save(masterProduct);
    }

    return { availableQuantity };
  }

  async recalculateAvailableQuantity(masterProductId: number): Promise<{ availableQuantity: number }> {
    this.logger.log(`Recalculating available quantity for MasterProduct: ${masterProductId}`);

    const masterProduct = await this.masterProductRepository.findOne(masterProductId);

    if (!masterProduct) {
      throw new RpcException('Master product not found');
    }

    const products = await this.productService.getProductsByStatus(ProductStatus.STORED, masterProduct.warehouseId);

    const availableQuantity = products
      .filter(product => product.masterProduct?.id === masterProductId)
      .reduce((total, product) => total + product.totalQuantity, 0);

    masterProduct.availableQuantity = availableQuantity;
    await this.masterProductRepository.save(masterProduct);

    this.logger.log(`Updated available quantity for MasterProduct ${masterProductId}: ${availableQuantity}`);

    return { availableQuantity };
  }

  async getAvailableQuantityByBarcode(barCode: string, warehouseId: number): Promise<{ availableQuantity: number }> {
    this.logger.log(`Request to get available quantity by barcode: ${barCode}`);

    const masterProduct = await this.masterProductRepository.findOne({
      where: {
        barCode: barCode,
        warehouseId: warehouseId
      }
    });

    if (!masterProduct) {
      throw new RpcException('Master product not found with this barcode');
    }

    return this.getAvailableQuantity(masterProduct.id);
  }

  async bulkUpdateAvailableQuantities(warehouseId: number): Promise<void> {
    this.logger.log(`Bulk updating available quantities for warehouse: ${warehouseId}`);

    const masterProducts = await this.masterProductRepository.find({
      where: { warehouseId }
    });

    for (const masterProduct of masterProducts) {
      await this.recalculateAvailableQuantity(masterProduct.id);
    }

    this.logger.log(`Completed bulk update for ${masterProducts.length} master products`);
  }

  async getAllWithAvailableQuantity(warehouseId: number): Promise<any[]> {
    this.logger.log(`Getting all master products with available quantities for warehouse: ${warehouseId}`);

    const queryBuilder = this.masterProductRepository.createQueryBuilder('master');

    const masterProducts = await queryBuilder
      .leftJoinAndSelect('master.productCategory', 'productCategory')
      .leftJoinAndSelect('master.suppliers', 'suppliers')
      .where('master.warehouseId = :warehouseId', { warehouseId })
      .andWhere('master.status != :status', { status: MasterProductStatus.DISABLE })
      .getMany();

    const productQuantities = await this.productService['productRepository']
      .createQueryBuilder('product')
      .select('product.masterProductId', 'masterProductId')
      .addSelect('SUM(product.totalQuantity)', 'availableQuantity')
      .where('product.warehouseId = :warehouseId', { warehouseId })
      .andWhere('product.status = :status', { status: ProductStatus.STORED })
      .groupBy('product.masterProductId')
      .getRawMany();

    const quantityMap = new Map(
      productQuantities.map(item => [
        parseInt(item.masterProductId),
        parseInt(item.availableQuantity) || 0
      ])
    );

    const result = masterProducts.map(masterProduct => ({
      ...masterProduct,
      availableQuantity: quantityMap.get(masterProduct.id) || 0
    }));

    return result;
  }

  async getAvailableQuantityByWarehouse(warehouseId: number, page: number = 1, limit: number = 10): Promise<ResponseDTO> {
    this.logger.log(`Getting paginated master products with quantities for warehouse: ${warehouseId}`);

    const queryBuilder = this.masterProductRepository.createQueryBuilder('master');

    queryBuilder
      .leftJoinAndSelect('master.productCategory', 'productCategory')
      .leftJoinAndSelect('productCategory.parentProductCategory', 'parentProductCategory')
      .leftJoinAndSelect('master.suppliers', 'suppliers')
      .where('master.warehouseId = :warehouseId', { warehouseId })
      .andWhere('master.status != :status', { status: MasterProductStatus.DISABLE });

    const skippedItems = (page - 1) * limit;

    queryBuilder
      .skip(skippedItems)
      .take(limit)
      .orderBy('master.id', 'ASC');

    const [masterProducts, totalItem] = await queryBuilder.getManyAndCount();

    const masterProductIds = masterProducts.map(mp => mp.id);

    let quantityMap = new Map();

    if (masterProductIds.length > 0) {
      const productQuantities = await this.productService['productRepository']
        .createQueryBuilder('product')
        .select('product.masterProductId', 'masterProductId')
        .addSelect('SUM(product.totalQuantity)', 'availableQuantity')
        .where('product.warehouseId = :warehouseId', { warehouseId })
        .andWhere('product.status = :status', { status: ProductStatus.STORED })
        .andWhere('product.masterProductId IN (:...masterProductIds)', { masterProductIds })
        .groupBy('product.masterProductId')
        .getRawMany();

      quantityMap = new Map(
        productQuantities.map(item => [
          parseInt(item.masterProductId),
          parseInt(item.availableQuantity) || 0
        ])
      );
    }

    const data = masterProducts.map(masterProduct => ({
      masterProduct: masterProduct,
      quantity: quantityMap.get(masterProduct.id) || 0
    }));

    return {
      data,
      totalItem
    };
  }

}
