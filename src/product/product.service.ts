import { forwardRef, HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { BlocksService } from 'src/blocks/blocks.service';
import { ScanType } from 'src/common/enums/scan-type.enum';
import { IdsDTO } from 'src/common/list-id.dto';
import { ResponseDTO } from 'src/common/response.dto';
import { DECREMENT, INCREMENT, PRODUCT_CODE_PATTERN, STATUS_UPDATE_CAPACITY_ARRAY } from 'src/constants/product.constants';
import { MasterProductsService } from 'src/master-products/master-products.service';
import { ProductCategorysService } from 'src/product-categorys/product-categorys.service';
import { RecommendDTO } from 'src/racks/dto/recommend-rack.dto';
import { Rack } from 'src/racks/entities/rack.entity';
import { RacksService } from 'src/racks/racks.service';
import { ReceiptsService } from 'src/receipts/receipts.service';
import { SuppliersService } from 'src/suppliers/suppliers.service';
import { ZoneService } from 'src/zone/zone.service';
import { Repository, Transaction } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductFilter } from './dto/filter-product.dto';
import { RackProductDTO } from './dto/rack-product.dto';
import { RecommendProduct } from './dto/recommend-product.dto';
import { ProductDTO, ProductScanResponse } from './dto/response-product.dto';
import { ScanProduct } from './dto/scan-product.dto';
import { SplitProduct } from './dto/split-product.dto';
import { UpdateLocationProduct } from './dto/update-location-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProducts } from './dto/update-products.dto';
import { Product } from './entities/product.entity';
import { ProductStatus } from './enum/product-status.enum';
import * as fs from 'fs';
import readXlsxFile from 'read-excel-file/node';
import { BufferedFile } from 'src/common/buffered-file.dto';
import { parseDate } from 'src/common/partDateTime';

@Injectable()
export class ProductService {

  private readonly logger = new Logger(ProductService.name);

  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,

    @Inject(forwardRef(() => RacksService))
    private readonly racksService: RacksService,
    @Inject(forwardRef(() => ProductCategorysService))
    private readonly productCategorysService: ProductCategorysService,
    @Inject(forwardRef(() => ReceiptsService))
    private readonly receiptsService: ReceiptsService,
    @Inject(forwardRef(() => SuppliersService))
    private readonly suppliersService: SuppliersService,
    @Inject(forwardRef(() => ZoneService))
    private readonly zoneService: ZoneService,
    @Inject(forwardRef(() => MasterProductsService))
    private readonly masterProductsService: MasterProductsService,
    @Inject(forwardRef(() => BlocksService))
    private readonly blocksService: BlocksService
  ) { }

  async create(createProductDto: CreateProductDto) {
    this.logger.log(`Request to save Product: ${createProductDto.name}`);
    createProductDto.totalQuantity = createProductDto.expectedQuantity;
    createProductDto.name = createProductDto.name?.trim();

    const newProduct = this.productRepository.create(createProductDto);

    if (createProductDto.receiptId)
      newProduct.receipt = await this.receiptsService.findOne(createProductDto?.receiptId);

    if (createProductDto.blockId)
      newProduct.block = await this.blocksService.findOne(createProductDto?.blockId);

    if (createProductDto.zoneId)
      newProduct.zone = await this.zoneService.findOne(createProductDto?.zoneId);

    if (createProductDto.supplierId)
      newProduct.supplier = await this.suppliersService.findOne(createProductDto?.supplierId);

    if (createProductDto.masterProductId)
      newProduct.masterProduct = await this.masterProductsService.findOne(createProductDto?.masterProductId);

    if (createProductDto.barCode)
      newProduct.masterProduct = await this.masterProductsService.findByBarcode(createProductDto?.barCode);
    
    if (createProductDto.rackCode)
      newProduct.rack = await this.racksService.findOneByCode(createProductDto?.rackCode,newProduct.warehouseId);

    if(createProductDto.status1)
    {
      newProduct.status = ProductStatus.STORED;
      if (newProduct.rack) {
        newProduct.rack.usedCapacity += (newProduct.masterProduct.capacity * newProduct.totalQuantity);
        await this.racksService.update(newProduct.rack.id, newProduct.rack);
      }
    }
    else
    newProduct.status = ProductStatus.NEW;

    const res = await this.productRepository.save(newProduct);
    const date = new Date(res.importDate);
    date.setDate(date.getDate() + newProduct?.masterProduct?.stogareTime)
    if (!date) res.storageDate = parseDate(new Date());
    else res.storageDate = date;
    res.code = PRODUCT_CODE_PATTERN + res.id;
    const data = await this.productRepository.save(res);
    if (data) {
      if(data.masterProduct && data.status === ProductStatus.STORED) {
        const master = await this.masterProductsService.findOne(data.masterProduct.id);
        master.availableQuantity = master.availableQuantity + data.totalQuantity;
        await this.masterProductsService.update(master.id, master);
      }
    }
    const product = await this.productRepository.findOne(res.id, { relations: ['supplier'] });
    return product;
  }

  async cancelReallocating(productDtos: UpdateProductDto[]) {
    this.logger.log(`Request to cancel reallocating`);
    let products = [];
    for (const element of productDtos) {
      const product = await this.productRepository.findOne(element.id, { relations: ['masterProduct'] });
      this.updateRackUsedCapacity(product.masterProduct.capacity, element.idRackReallocate, element.totalQuantity, INCREMENT);
      element.status = ProductStatus.STORED;
      products.push(element);
    }
    return this.productRepository.save(products);
  }

  async addRack(rackProductDTO: RackProductDTO) {
    this.logger.log(`Request to add rack: ${rackProductDTO.rackId}`);
    const rack = await this.racksService.findOne(rackProductDTO.rackId);
    const products = [];
    rackProductDTO.productIds.forEach(async id => {
      const product = await this.productRepository.findOne(id, { relations: ['masterProduct'] });
      product.status = ProductStatus.STORED;
      product.rack = rack;
      this.updateRackUsedCapacity(product.masterProduct.capacity, rack.id, product.totalQuantity, INCREMENT);
      products.push(product);
    })
    this.productRepository.save(products);
    return products;
  }

  async createAll(createProductDtos: CreateProductDto[]) {
    this.logger.log(`Request to add all products`);
    for (const product of createProductDtos) {
      this.create(product);
    }
  }

  async splitProduct(splitProduct: SplitProduct) {
    this.logger.log(`Request to split product: ${splitProduct.id}`);
    const product = await this.productRepository.findOne(splitProduct.id, { relations: ['masterProduct', 'zone', 'block', 'rack', 'receipt'] });
    if (product.totalQuantity <= splitProduct.quantity)
      throw new RpcException('Not enough quantity');
    product.totalQuantity -= splitProduct.quantity;
    await this.productRepository.save(product);

    const newProduct = new Product();
    Object.assign(newProduct, product);
    newProduct.totalQuantity = splitProduct.quantity;
    delete newProduct.id;
    const res = await this.productRepository.save(newProduct);
    if (splitProduct.isUpdateCode) {

    } else {
      

      let codeTemp = "";
      if (product?.code?.includes("_")) {
        codeTemp = product.code.split("_")[0];
      } else codeTemp = product.code;

      const count = await this.productRepository.createQueryBuilder("product")
        .where("product.code LIKE :code", { code: `${codeTemp}%` })
        .andWhere("product.status NOT IN (:...status)", { status: [ProductStatus.ERROR, ProductStatus.LOST, ProductStatus.DISABLE] })
        .getCount();
      //   res.code = PRODUCT_CODE_PATTERN + res.id;
      // res.status = product.status;
      // await this.productRepository.update(res.id, res);
      if (product.code.includes("T")) {
        const resCode = product.code.split("T")[0];
        res.code = resCode + "T" + count;
      } else {
        res.code = product.code + "_T" + count;
      }
      res.status = product.status;
      await this.productRepository.update(res.id, res);
    }

    return this.productRepository.createQueryBuilder("product")
      .leftJoinAndSelect('product.masterProduct', 'masterProduct')
      .leftJoinAndSelect('masterProduct.productCategory', 'productCategory')
      .leftJoinAndSelect('masterProduct.suppliers', 'suppliers')
      .leftJoinAndSelect('product.block', 'block')
      .leftJoinAndSelect('product.rack', 'rack')
      .leftJoinAndSelect('product.supplier', 'supplier')
      .leftJoinAndSelect('rack.shelf', 'shelf')
      .leftJoinAndSelect('product.receipt', 'receipt')
      .leftJoinAndSelect('product.zone', 'zone')
      .where('product.id = :id', { id: res.id })
      .getOne();
  }

  async findListProductByMasterProductId(recommendProduct: RecommendProduct): Promise<ResponseDTO> {
    this.logger.log(`Request to get products by masterProductId: ${recommendProduct.masterProductId}`);
    const queryBuilder = this.productRepository.createQueryBuilder("product");

    if (recommendProduct.masterProductId) {
      queryBuilder.leftJoinAndSelect('product.masterProduct', 'masterProduct')
      queryBuilder.where("masterProduct.id = :masterProductId", { masterProductId: recommendProduct.masterProductId })
    } else throw new RpcException('Master Product Id is required');

    queryBuilder.andWhere("product.status = :status", { status: ProductStatus.STORED });

    const skippedItems = (recommendProduct?.page - 1) * recommendProduct?.limit;

    if (!isNaN(skippedItems)) {
      queryBuilder
        .skip(skippedItems)
        .take(recommendProduct?.limit)

    }

    const data = queryBuilder.leftJoinAndSelect('masterProduct.suppliers', 'suppliers')
      .leftJoinAndSelect('masterProduct.productCategory', 'productCategory')
      .leftJoinAndSelect('product.rack', 'rack')
      .leftJoinAndSelect('product.block', 'block')
      .leftJoinAndSelect('product.supplier', 'supplier')
      .leftJoinAndSelect('rack.shelf', 'shelf')
      .leftJoinAndSelect('product.receipt', 'receipt')
      .leftJoinAndSelect('product.zone', 'zone')
      .orderBy("rack.id", "ASC")
      .getManyAndCount()

    const res = new ResponseDTO();
    await data?.then(rs => {
      res.totalItem = rs[1];
      res.data = rs[0];
    });
    let total = 0;
    const dataRecommend = [];
    let count = 0;
    for (const item of res.data) {
      if (total < recommendProduct.quantity) {
        total += item.totalQuantity;
        count++;
        dataRecommend.push(item);
      }
    }
    res.data = dataRecommend;
    res.totalItem = count;
    return res;
  }

  async findAll(productFilter: ProductFilter): Promise<ResponseDTO> {
    this.logger.log(`Request to get all products`);
    const queryBuilder = this.productRepository.createQueryBuilder("product");

    if (productFilter.warehouseId) {
      queryBuilder.where("product.warehouseId = :warehouseId", { warehouseId: productFilter.warehouseId })
    }

    if (productFilter.receiptId) {
      queryBuilder.andWhere("product.receiptId = :receiptId", { receiptId: productFilter.receiptId })
    }

    if (productFilter.blockId) {
      queryBuilder.leftJoinAndSelect('product.block', 'block5')
      queryBuilder.andWhere("block5.id = :blockId", { blockId: productFilter.blockId })
    }

    if (productFilter.orderId) {
      queryBuilder.andWhere("product.orderId = :orderId", { orderId: productFilter.orderId })
    }

    if (productFilter.group) {
      queryBuilder.andWhere("product.group = :group", { group: productFilter.group })
    }

    if (productFilter.masterProductId) {
      queryBuilder.leftJoinAndSelect('product.masterProduct', 'masterProduct1')
      queryBuilder.andWhere("masterProduct1.id = :masterProductId", { masterProductId: productFilter.masterProductId })
    }

    if (productFilter.keyword) {
      if (productFilter.keyword.startsWith(PRODUCT_CODE_PATTERN)) {
        queryBuilder.andWhere("product.code = :keyword", { keyword: productFilter.keyword })
      } else
        queryBuilder.leftJoinAndSelect('product.masterProduct', 'masterproduct2')
          .andWhere("masterProduct2.name LIKE :keyword", { keyword: `%${productFilter.keyword}%` })
    }

    if (productFilter.packageCode) {
      queryBuilder.andWhere("product.packageCode = :packageCode", { packageCode: productFilter.packageCode })
    }

    if (productFilter.multipleStatus) {
      const statusArr = productFilter?.multipleStatus?.split(",");
      queryBuilder.andWhere("product.status IN (:...statusArr)", { statusArr: statusArr })
    }

    if (productFilter.productCategoryId) {
      queryBuilder.leftJoinAndSelect('product.masterProduct', 'masterProduct3')
      queryBuilder.leftJoinAndSelect('masterProduct3.productCategory', 'productCategory1')
      queryBuilder.andWhere("productCategory1.id = :productCategoryId", { productCategoryId: productFilter.productCategoryId })
    }

    if (productFilter.supplierId) {
      queryBuilder.leftJoinAndSelect('product.masterProduct', 'masterProduct4')
      queryBuilder.leftJoinAndSelect('masterProduct4.supplier', 'supplier1')
      queryBuilder.andWhere("supplier1.id = :supplierId", { supplierId: productFilter.supplierId })
    }

    if (productFilter.rackId) {
      queryBuilder.leftJoinAndSelect('product.rack', 'rack1')
      queryBuilder.andWhere("rack1.id = :rackId", { rackId: productFilter.rackId })
    }

    if (productFilter.rackCode) {
      queryBuilder.leftJoinAndSelect('product.rack', 'rack2')
      queryBuilder.andWhere("rack2.code = :rackCode", { rackCode: productFilter.rackCode })
    }

    if (productFilter.status) {
      queryBuilder.andWhere('product.status = :status', { status: productFilter.status });
    } else {
      queryBuilder.andWhere('product.status != :status', { status: ProductStatus.DISABLE });
    }

    if (productFilter.startDate && productFilter.endDate) {
      const startDate = productFilter.startDate;
      const endDate = productFilter.endDate;
      queryBuilder.andWhere(`product.importDate BETWEEN '${startDate}' AND '${endDate}'`)
    }

    if (productFilter.startLostDate && productFilter.endLostDate) {
      const startLostDate = productFilter.startLostDate;
      const endLostDate = productFilter.endLostDate;
      queryBuilder.andWhere(`product.lostDate BETWEEN '${startLostDate}' AND '${endLostDate}'`)
    }

    if (productFilter.startReportDate && productFilter.endReportDate) {
      const startReportDate = productFilter.startReportDate;
      const endReportDate = productFilter.endReportDate;
      queryBuilder.andWhere(`product.reportDate BETWEEN '${startReportDate}' AND '${endReportDate}'`)
    }

    if (productFilter.startStorageDate && productFilter.endStorageDate) {
      const startStorageDate = productFilter.startStorageDate;
      const endStorageDate = productFilter.endStorageDate;
      queryBuilder.andWhere(`product.storageDate BETWEEN '${startStorageDate}' AND '${endStorageDate}'`)
    }

    if (productFilter.startExpireDate && productFilter.endExpireDate) {
      const startExpireDate = productFilter.startExpireDate;
      const endExpireDate = productFilter.endExpireDate;
      queryBuilder.andWhere(`product.expireDate BETWEEN '${startExpireDate}' AND '${endExpireDate}'`)
    }

    if (productFilter.sortBy && productFilter.sortDirection) {
      if (productFilter.sortDirection.toUpperCase() === "DESC")
        queryBuilder.orderBy(`product.${productFilter.sortBy}`, "DESC");
      else queryBuilder.orderBy(`product.${productFilter.sortBy}`, "ASC");
    } else {
      queryBuilder.orderBy("product.id", "ASC");
    }

    const skippedItems = (productFilter?.page - 1) * productFilter?.limit;

    if (!isNaN(skippedItems)) {
      queryBuilder
        .skip(skippedItems)
        .take(productFilter?.limit)
    }

    const data = queryBuilder
      .leftJoinAndSelect('product.masterProduct', 'masterProduct')
      .leftJoinAndSelect('masterProduct.productCategory', 'productCategory')
      .leftJoinAndSelect('masterProduct.suppliers', 'suppliers')
      .leftJoinAndSelect('product.block', 'block')
      .leftJoinAndSelect('product.rack', 'rack')
      .leftJoinAndSelect('product.supplier', 'supplier')
      .leftJoinAndSelect('rack.shelf', 'shelf')
      .leftJoinAndSelect('product.receipt', 'receipt')
      .leftJoinAndSelect('product.zone', 'zone')
      .getManyAndCount()

    const res = new ResponseDTO();
    await data?.then(rs => {
      res.totalItem = rs[1];
      res.data = rs[0];
    });
    return res;
  }

  async getInventory(productFilter: ProductFilter) {
    this.logger.log(`Request to get inventory products`);
    const queryBuilder = this.productRepository.createQueryBuilder("product");
    if (productFilter.masterProductCode) {
      queryBuilder.leftJoinAndSelect('product.masterProduct', 'masterProduct')
      queryBuilder.where("masterProduct.code = :masterProductCode", { masterProductCode: productFilter.masterProductCode })
    }
    queryBuilder.andWhere('product.status = :status', { status: ProductStatus.STORED });
    return queryBuilder.getCount();
  }

  async findOne(id: number): Promise<Product> {
    this.logger.log(`Request to get products: ${id}`);
    const product = await this.productRepository.findOne(id);
    if (product) {
      return product;
    }
    throw new RpcException('Not found product');
  }

  async update(id: number, currentProduct: UpdateProductDto) {
    this.logger.log(`Request to update product: ${id}`);
    const productBeforeUpdate = await this.productRepository.findOne(id, { relations: ["masterProduct", "rack"] });
    if (!productBeforeUpdate) throw new HttpException('Not found product', HttpStatus.NOT_FOUND);

    if (currentProduct.rackId)
      currentProduct.rack = await this.racksService.findOne(currentProduct?.rackId);
    else if (currentProduct.rackId === null) currentProduct.rack = null;

    if (currentProduct.receiptId)
      currentProduct.receipt = await this.receiptsService.findOne(currentProduct?.receiptId);
    else if (currentProduct.receiptId === null) currentProduct.receipt = null;

    if (currentProduct.zoneId)
      currentProduct.zone = await this.zoneService.findOne(currentProduct?.zoneId);
    else if (currentProduct.zoneId === null) currentProduct.zone = null;

    if (currentProduct.masterProductId)
      currentProduct.masterProduct = await this.masterProductsService.findOne(currentProduct?.masterProductId);
    else if (currentProduct.masterProductId === null) currentProduct.masterProduct = null;

    if (currentProduct.supplierId)
      currentProduct.supplier = await this.suppliersService.findOne(currentProduct?.supplierId);
    else if (currentProduct.supplierId === null) currentProduct.supplier = null;

    if (currentProduct.blockId)
      currentProduct.block = await this.blocksService.findOne(currentProduct?.blockId);
    else if (currentProduct.blockId === null) currentProduct.block = null;

    if (currentProduct.status !== ProductStatus.ERROR && currentProduct.status !== ProductStatus.LOST
      && productBeforeUpdate.status !== ProductStatus.ERROR && productBeforeUpdate.status !== ProductStatus.LOST) {
      if (productBeforeUpdate?.rack?.id !== currentProduct?.rack?.id) {
        if (STATUS_UPDATE_CAPACITY_ARRAY.includes(currentProduct.status)) {
          await this.updateRackUsedCapacity(productBeforeUpdate.masterProduct.capacity,
            currentProduct?.rack?.id, currentProduct?.totalQuantity, INCREMENT);
        }
        if (STATUS_UPDATE_CAPACITY_ARRAY.includes(productBeforeUpdate.status) && currentProduct.status !== ProductStatus.REALLOCATE) {
          await this.updateRackUsedCapacity(productBeforeUpdate.masterProduct.capacity,
            productBeforeUpdate?.rack?.id, productBeforeUpdate.totalQuantity, DECREMENT);
        }
      } else {

        if (productBeforeUpdate.status !== currentProduct.status) {
          if (currentProduct.status === ProductStatus.STORED && productBeforeUpdate.status === ProductStatus.REALLOCATE) {
            const capacity = productBeforeUpdate?.masterProduct?.capacity;
            await this.updateRackUsedCapacity(capacity, productBeforeUpdate.idRackReallocate, productBeforeUpdate.totalQuantity, DECREMENT);
          } else if (STATUS_UPDATE_CAPACITY_ARRAY.includes(currentProduct.status) &&
            !STATUS_UPDATE_CAPACITY_ARRAY.includes(productBeforeUpdate.status)) {
            const capacity = productBeforeUpdate?.masterProduct?.capacity;
            await this.updateRackUsedCapacity(capacity, productBeforeUpdate?.rack?.id,
              productBeforeUpdate.totalQuantity, INCREMENT);
          }
        } else if (productBeforeUpdate.totalQuantity !== currentProduct?.totalQuantity && STATUS_UPDATE_CAPACITY_ARRAY.includes(currentProduct.status)) {
          if (productBeforeUpdate.totalQuantity > currentProduct?.totalQuantity) {
            const totalIncrement = productBeforeUpdate.totalQuantity - currentProduct?.totalQuantity;
            const capacity = productBeforeUpdate?.masterProduct?.capacity;
            await this.updateRackUsedCapacity(capacity, productBeforeUpdate?.rack?.id, totalIncrement, DECREMENT);
          } else if (productBeforeUpdate.totalQuantity < currentProduct?.totalQuantity) {
            const totalDecrement = currentProduct?.totalQuantity - productBeforeUpdate.totalQuantity;
            const capacity = productBeforeUpdate?.masterProduct?.capacity;
            await this.updateRackUsedCapacity(capacity, productBeforeUpdate?.rack?.id, totalDecrement, INCREMENT);
          }
        }

      }
    }

    if (currentProduct.status === ProductStatus.ERROR) {
      currentProduct.reportDate = parseDate(new Date());

      if (currentProduct.lostNumber > 0 && currentProduct.lostNumber < productBeforeUpdate.totalQuantity) {
        const splitProduct = new SplitProduct();
        splitProduct.id = currentProduct.id;
        splitProduct.quantity = currentProduct.lostNumber;
        splitProduct.isUpdateCode = true;
        const split = await this.splitProduct(splitProduct);
        split.status = ProductStatus.ERROR;
        split.description = currentProduct.description;
        await this.productRepository.update(split.id, split);
        currentProduct.status = productBeforeUpdate.status;
        currentProduct.description = "";
        currentProduct.totalQuantity = productBeforeUpdate.totalQuantity - currentProduct.lostNumber;
        if (productBeforeUpdate?.rack?.id)
          await this.updateRackUsedCapacity(productBeforeUpdate?.masterProduct?.capacity, productBeforeUpdate?.rack?.id, currentProduct.lostNumber, DECREMENT);

      }
    }

    if (productBeforeUpdate.status === ProductStatus.ERROR && currentProduct.status !== ProductStatus.ERROR && currentProduct.status !== ProductStatus.LOST) {

      let codeTemp = "";
      if (productBeforeUpdate?.code?.includes("_")) {
        codeTemp = productBeforeUpdate.code.split("_")[0];
      } else codeTemp = productBeforeUpdate.code;

      const count = await this.productRepository.createQueryBuilder("product")
        .where("product.code LIKE :code", { code: `${codeTemp}%` })
        .andWhere("product.status = :status", { status: ProductStatus.TEMPORARY })
        .getCount();

      if (currentProduct?.totalQuantity === productBeforeUpdate.totalQuantity) {

        if (productBeforeUpdate?.code?.includes("T")) {
          const res = productBeforeUpdate?.code?.split("T")[0];
          currentProduct.code = res + "T" + count;
        } else {
          currentProduct.code = productBeforeUpdate.code + "_T" + count;
        }

        currentProduct.status = ProductStatus.TEMPORARY;
      } else if (currentProduct?.totalQuantity < productBeforeUpdate.totalQuantity) {
        const splitProduct = new SplitProduct();
        splitProduct.id = currentProduct.id;
        splitProduct.quantity = currentProduct.totalQuantity;
        splitProduct.isUpdateCode = true;
        const split = await this.splitProduct(splitProduct);
        split.status = ProductStatus.TEMPORARY;
        split.description = currentProduct.description;

        if (productBeforeUpdate.code.includes("T")) {
          const res = productBeforeUpdate.code.split("T")[0];
          split.code = res + "T" + count;
        } else {
          split.code = productBeforeUpdate.code + "_T" + count;
        }

        await this.productRepository.update(split.id, split);
        currentProduct.totalQuantity = productBeforeUpdate.totalQuantity - currentProduct?.totalQuantity;
        currentProduct.status = ProductStatus.ERROR;
      }

      if (productBeforeUpdate?.rack?.id)
        await this.updateRackUsedCapacity(productBeforeUpdate?.masterProduct?.capacity, productBeforeUpdate?.rack?.id, productBeforeUpdate.totalQuantity, INCREMENT);

    }

    if (productBeforeUpdate.status === ProductStatus.LOST && currentProduct.status !== ProductStatus.LOST && currentProduct.status !== ProductStatus.ERROR) {
      let codeTemp = "";
      if (productBeforeUpdate.code.includes("_")) {
        codeTemp = productBeforeUpdate.code.split("_")[0];
      } else codeTemp = productBeforeUpdate.code;
      const count = await this.productRepository.createQueryBuilder("product")
        .where("product.code LIKE :code", { code: `${codeTemp}%` })
        .andWhere("product.status = :status", { status: ProductStatus.TEMPORARY })
        .getCount();

      if (currentProduct?.totalQuantity === productBeforeUpdate.totalQuantity) {
        if (productBeforeUpdate?.code?.includes("T")) {
          const res = productBeforeUpdate.code.split("T")[0];
          currentProduct.code = res + "T" + count;
        } else {
          currentProduct.code = productBeforeUpdate.code + "_T" + count;
        }

        currentProduct.status = ProductStatus.TEMPORARY;
      } else if (currentProduct?.totalQuantity < productBeforeUpdate.totalQuantity) {
        const splitProduct = new SplitProduct();
        splitProduct.id = currentProduct.id;
        splitProduct.quantity = currentProduct.totalQuantity;
        splitProduct.isUpdateCode = true;
        const split = await this.splitProduct(splitProduct);
        split.status = ProductStatus.TEMPORARY;
        split.description = currentProduct.description;
        if (productBeforeUpdate.code.includes("T")) {
          const res = productBeforeUpdate.code.split("T")[0];
          split.code = res + "T" + count;
        } else {
          split.code = productBeforeUpdate.code + "_T" + count;
        }
        await this.productRepository.update(split.id, split);
        currentProduct.totalQuantity = productBeforeUpdate.totalQuantity - currentProduct?.totalQuantity;
        currentProduct.status = ProductStatus.LOST;
      }

      if (productBeforeUpdate?.rack?.id)
        await this.updateRackUsedCapacity(productBeforeUpdate?.masterProduct?.capacity, productBeforeUpdate?.rack?.id, productBeforeUpdate.totalQuantity, INCREMENT);

    }

    if (currentProduct.status === ProductStatus.STORED && productBeforeUpdate.status !== ProductStatus.STORED) {
      const master = await this.masterProductsService.findOne(productBeforeUpdate.masterProduct.id);
      if (currentProduct.totalQuantity)
        master.availableQuantity = master.availableQuantity + currentProduct.totalQuantity;
      await this.masterProductsService.update(master.id, master);
    }

    if (currentProduct.status !== ProductStatus.STORED && productBeforeUpdate.status === ProductStatus.STORED) {
      const master = await this.masterProductsService.findOne(productBeforeUpdate.masterProduct.id);
      if (currentProduct.totalQuantity && master.availableQuantity >= currentProduct.totalQuantity)
        master.availableQuantity = master.availableQuantity - currentProduct.totalQuantity;
      await this.masterProductsService.update(master.id, master);
    }

    delete currentProduct.masterProductId;
    delete currentProduct.zoneId;
    delete currentProduct.receiptId;
    delete currentProduct.blockId;
    delete currentProduct.rackId;
    delete currentProduct.supplierId;
    delete currentProduct.lostNumber;

    await this.productRepository.update(id, currentProduct);
    const updateProduct = await this.productRepository.findOne(id, { relations: ["masterProduct", "block", "rack", "receipt", "zone"] });
    if (updateProduct) {
      return updateProduct;
    }
  }

  async updateProductCapacity(master: number, productBeforeUpdate: Product, currentProduct: UpdateProductDto) {
    if (productBeforeUpdate?.rack?.id !== currentProduct?.rack?.id) {
      if (productBeforeUpdate?.rack?.id && STATUS_UPDATE_CAPACITY_ARRAY.includes(productBeforeUpdate.status)) {
        await this.updateRackUsedCapacity(master, productBeforeUpdate?.rack?.id, productBeforeUpdate?.totalQuantity, DECREMENT);
      }

      if (currentProduct?.rack?.id && STATUS_UPDATE_CAPACITY_ARRAY.includes(currentProduct.status)) {
        await this.updateRackUsedCapacity(master, currentProduct?.rack?.id, currentProduct?.totalQuantity, INCREMENT);
      }

    } else {
      if (currentProduct?.rack?.id && productBeforeUpdate?.totalQuantity > currentProduct?.totalQuantity) {
        const totalIncrement = productBeforeUpdate?.totalQuantity - currentProduct?.totalQuantity;
        await this.updateRackUsedCapacity(master, currentProduct?.rack?.id, totalIncrement, DECREMENT);
      } else if (currentProduct?.rack?.id && productBeforeUpdate?.totalQuantity < currentProduct?.totalQuantity) {
        const totalDecrement = currentProduct?.totalQuantity - productBeforeUpdate?.totalQuantity;
        await this.updateRackUsedCapacity(master, currentProduct?.rack?.id, totalDecrement, INCREMENT);
      }
    }
  }

  async remove(id: number) {
    this.logger.log(`Request to remove product: ${id}`);
    const product = await this.productRepository.findOne(id, { relations: ['masterProduct'] });

    if (!product) {
      throw new RpcException('Not found product');
    } else {
      product.status = ProductStatus.DISABLE;
      await this.productRepository.save(product);
      if (product?.rack) {
        const rack = product?.rack;
        const master = product?.masterProduct?.capacity;
        this.updateRackUsedCapacity(master, rack?.id, product?.totalQuantity, DECREMENT);
      }

    }
  }

  async updateRackUsedCapacity(masterCapacity: number, rackId: number, totalQuantity: number, typeUpdate: string) {
    const total = masterCapacity * totalQuantity;
    const rack = await this.racksService.findOne(rackId);
    if (!rack) throw new RpcException('Not found rack');
    if (typeUpdate === INCREMENT && rack?.capacity >= total + rack?.usedCapacity)
      rack.usedCapacity += total;
    else if (typeUpdate === DECREMENT && rack?.usedCapacity >= total)
      rack.usedCapacity -= total;
    else throw new RpcException('Not enough capacity');

    return await this.racksService.update(rack?.id, rack);

  }

  async removes(idsDTO: IdsDTO) {
    this.logger.log(`Request to removes products`);
    for (const id of idsDTO.ids) {
      this.remove(Number(id));
    }
  }

  async updates(updateProducts: UpdateProducts) {
    this.logger.log(`Request to updates products`);

    let rack: Rack;
    if (updateProducts.rackId)
      rack = await this.racksService.findOne(updateProducts.rackId);

    const products = [];
    for (let id of updateProducts.ids) {
      const pro = await this.productRepository.findOne(id, { relations: ["masterProduct", "block", "rack", "receipt", "zone"] });
      if (!pro) throw new RpcException('Not found product');
      if (updateProducts.status) pro.status = updateProducts.status;
      if (updateProducts.orderId) pro.orderId = updateProducts.orderId;
      if (updateProducts.packageCode) pro.packageCode = updateProducts.packageCode;
      if (updateProducts.group) pro.group = updateProducts.group;
      if (rack?.id) {
        pro.rack = rack;
        pro.block = rack?.shelf?.block;
      }
      products.push(pro);
      
      if (pro?.masterProduct && updateProducts.status === ProductStatus.STORED) {
        const master = await this.masterProductsService.findOne(pro.masterProduct.id);
        if (master.availableQuantity)
          master.availableQuantity = master.availableQuantity + pro.totalQuantity;
        else {
          master.availableQuantity = pro.totalQuantity;
        }
        await this.masterProductsService.update(master.id, master);
      }
    }
    this.productRepository.save(products);
    return products;
  }

  async updateLocation(updateLocation: UpdateLocationProduct) {
    this.logger.log(`Request to update location`);
    const recommendRack = new RecommendDTO();

    const res: Product[] = [];
    for (const id of updateLocation?.productIds) {
      //const productBeforeUpdate = await this.productRepository.findOne(Number(id), { relations: ["masterProduct"] });

      const productBeforeUpdate = await this.productRepository.createQueryBuilder("product")
        .where("product.id = :id", { id: Number(id) })
        .leftJoinAndSelect('product.masterProduct', 'masterProduct')
        .leftJoinAndSelect('masterProduct.productCategory', 'productCategory')
        .leftJoinAndSelect('productCategory.parentProductCategory', 'parentProductCategory')
        .getOne();

      recommendRack.totalCapacity = productBeforeUpdate?.totalQuantity * productBeforeUpdate.masterProduct.capacity;
      recommendRack.parentProductCategoryId = productBeforeUpdate?.masterProduct?.productCategory?.parentProductCategory?.id;
      recommendRack.warehouseId = productBeforeUpdate?.warehouseId;
      const rack = await this.racksService.recommendRack(recommendRack);

      const product = new UpdateProductDto();
      const productAfter = Object.assign(product, productBeforeUpdate);
      if (rack) {
        productAfter.rack = rack;
        productAfter.block = rack?.shelf?.block;
        rack.usedCapacity += (productBeforeUpdate.masterProduct.capacity * productBeforeUpdate.totalQuantity);
        await this.racksService.update(rack.id, rack);
        const afterPro = await this.productRepository.save(productAfter);
        res.push(afterPro);
      }
    }
    return res;
  }

  async scan(scanProduct: ScanProduct) {
    this.logger.log(`Request to scan product`);
    const queryBuilder = this.productRepository.createQueryBuilder("product");

    if (scanProduct.type) {
      if (scanProduct.productCodes) {
        queryBuilder.where("product.code IN (:...codes)", { codes: scanProduct.productCodes });
      }

      if (scanProduct.packageCodes && scanProduct?.packageCodes?.length > 0) {
        queryBuilder.andWhere("product.packageCode IN (:...packageCodes)", { packageCodes: scanProduct.packageCodes });
      }

      if (scanProduct.barCodes && scanProduct?.barCodes?.length > 0) {
        queryBuilder.leftJoinAndSelect('product.masterProduct', 'masterProduct1')
        queryBuilder.andWhere("masterProduct1.barCode IN (:...barCodes)", { barCodes: scanProduct.barCodes })
        queryBuilder.andWhere("product.status IN (:...status)", { status: [ProductStatus.PICKING] });
      }
    
      if (scanProduct.type === ScanType.TEMPORARY_INBOUND && scanProduct?.productCodes?.length > 0) {
        queryBuilder.andWhere("product.status IN (:...status)", { status: [ProductStatus.TEMPORARY_OUT, ProductStatus.NEW] });
      }

      if (scanProduct.type === ScanType.OUTBOUND_PICKING && scanProduct?.productCodes?.length > 0) {
        queryBuilder.andWhere("product.status IN (:...status)", { status: [ProductStatus.REALLOCATE, ProductStatus.TEMPORARY, ProductStatus.STORED, ProductStatus.MOVING] });
      }

      if (scanProduct.type === ScanType.STORING && scanProduct?.productCodes?.length > 0) {
        queryBuilder.andWhere("product.status IN (:...status)", { status: [ProductStatus.REALLOCATE, ProductStatus.TEMPORARY] });
      }

      if (scanProduct.type === ScanType.REALLOCATE && scanProduct?.productCodes?.length > 0) {
        queryBuilder.andWhere("product.status IN (:...status)", { status: [ProductStatus.REALLOCATE, ProductStatus.STORED] });
      }

      if (scanProduct.type === ScanType.INBOUND_CONTROL && scanProduct?.productCodes?.length > 0) {
        queryBuilder.andWhere("product.status IN (:...status)", { status: [ProductStatus.REALLOCATE, ProductStatus.MOVING] });
      }

      if (scanProduct.warehouseId) {
        queryBuilder.andWhere("product.warehouseId = :warehouseId", { warehouseId: scanProduct.warehouseId });
      } else throw new RpcException('warehouseId is required');

    }
    else throw new RpcException('Codes and type is required');

    const skippedItems = (scanProduct?.page - 1) * scanProduct?.limit;

    if (!isNaN(skippedItems)) {
      queryBuilder
        .skip(skippedItems)
        .take(scanProduct?.limit)
    }

    const data = await queryBuilder
      .leftJoinAndSelect('product.masterProduct', 'masterProduct')
      .leftJoinAndSelect('masterProduct.productCategory', 'productCategory')
      .leftJoinAndSelect('masterProduct.suppliers', 'suppliers')
      .leftJoinAndSelect('product.block', 'block')
      .leftJoinAndSelect('product.rack', 'rack')
      .leftJoinAndSelect('product.supplier', 'supplier')
      .leftJoinAndSelect('rack.shelf', 'shelf')
      .leftJoinAndSelect('product.receipt', 'receipt')
      .leftJoinAndSelect('product.zone', 'zone')
      .getMany()

    const res = [];
    const codes = [];
    for (const element of data) {
      codes.push(element.code);
    }
    const codePackages = [];
    for (const element of data) {
      codePackages.push(element.packageCode);
    }

    let difference = scanProduct?.productCodes?.filter(x => !codes.includes(x));
    let differencePackage = scanProduct?.packageCodes?.filter(x => !codePackages.includes(x));
    const responseScans = new ProductScanResponse();
    for (const rep of data) {
      let dto = new ProductDTO();
      dto = Object.assign(dto, rep);
      res.push(dto);
    }
    if (!scanProduct.productCodes) {
      responseScans.errList = differencePackage;
    }
    if (scanProduct.productCodes && scanProduct.packageCodes) {
      responseScans.errList = difference?.concat(differencePackage);
    }
    if (!scanProduct.packageCodes) {
      responseScans.errList = difference;
    }
    responseScans.successList = res;

    if (scanProduct.rackCode) {
      const rak = await this.racksService.findOneByCode(scanProduct.rackCode, scanProduct.warehouseId);
      if (rak?.id) responseScans.rack = rak;
      else throw new RpcException('Not found rack');
    }


    return responseScans;

  }

  getOnHandProductId(masterProductId: number, warehouseId: number) {
    return this.productRepository.createQueryBuilder("product")
      .select('SUM(product.totalQuantity)', 'value')
      .where('product.masterProductId = :masterProductId', { masterProductId: masterProductId })
      .andWhere('product.warehouseId = :warehouseId', { warehouseId: warehouseId })
      .andWhere('product.status IN (:...status)', { status: [ProductStatus.STORED, ProductStatus.MOVING, ProductStatus.TEMPORARY, ProductStatus.REALLOCATE, ProductStatus.NEW] })
      .getRawOne();
  }


  getOnHandProductMonth(masterProductId: number, month: number, year: number, warehouseId: number) {
    return this.productRepository.createQueryBuilder("product")
      .select('SUM(product.totalQuantity)', 'value')
      .addSelect("date_part('month', product.importDate)", 'value2')
      .where('product.masterProductId = :masterProductId', { masterProductId: masterProductId })
      .andWhere('product.warehouseId = :warehouseId', { warehouseId: warehouseId })
      .andWhere("date_part('month', product.importDate) = :month", { month: month })
      .andWhere("date_part('year', product.importDate) = :year", { year: year })
      .groupBy("date_part('month', product.importDate)")
      .getRawMany();
  }

  async getOnHandCategoryMonth(productCategoryId: number, month: number, year: number, warehouseId: number) {
    return this.productRepository.createQueryBuilder("product")
      .select('SUM(product.totalQuantity)', 'value')
      .addSelect("product.productCategoryId", 'value2')
      .where("date_part('month', product.importDate) = :month", { month: month })
      .andWhere('product.productCategoryId = :productCategoryId', { productCategoryId: productCategoryId })
      .andWhere('product.warehouseId = :warehouseId', { warehouseId: warehouseId })
      .andWhere("date_part('year', product.importDate) = :year", { year: year })
      .groupBy("product.productCategoryId")
      .getRawMany();
  }

  async getReportInboundProduct(month: number, year: number, warehouseId: number) {
    return this.productRepository.createQueryBuilder("product")
      .select('SUM(product.totalQuantity)', 'value')
      .addSelect("product.inboundKind", 'value2')
      .where("date_part('month', product.importDate) = :month", { month: month })
      .andWhere('product.warehouseId = :warehouseId', { warehouseId: warehouseId })
      .andWhere("date_part('year', product.importDate) = :year", { year: year })
      .groupBy("product.inboundKind")
      .getRawMany();
  }

  async getReportInventoryProduct(month: number, year: number, warehouseId: number) {
    return this.productRepository.createQueryBuilder("product")
      .select('SUM(product.totalQuantity)', 'value')
      .addSelect("product.productCategoryId", 'value2')
      .where("date_part('month', product.importDate) = :month", { month: month })
      .andWhere('product.warehouseId = :warehouseId', { warehouseId: warehouseId })
      .andWhere("date_part('year', product.importDate) = :year", { year: year })
      .groupBy("product.productCategoryId")
      .getRawMany();
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
                const product = new CreateProductDto();
                if (data[1])
                  product.masterProductId = parseInt(data[1].toString());

                if (data[3])
                  product.supplierId = parseInt(data[3].toString());

                if (data[4])
                  product.expireDate = new Date(data[4].toString());

                if (data[5])
                  product.rackCode = data[5].toString();

                if (data[6])
                  product.expectedQuantity = parseInt(data[6].toString());

                if (data[7])
                  product.status1 = data[7].toString();

                if (data[8])
                  product.blockId = parseInt(data[8].toString());

                //console.log("Đây là số lượng : " + product.totalQuantity);
                product.warehouseId = dataExcel.warehouseId;
                res.push(await this.create(product));
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

}

