import { forwardRef, HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import * as fs from 'fs';
import readXlsxFile from 'read-excel-file/node';
import { BlocksService } from 'src/blocks/blocks.service';
import { Block } from 'src/blocks/entities/block.entity';
import { BufferedFile } from 'src/common/buffered-file.dto';
import { ScanType } from 'src/common/enums/scan-type.enum';
import { IdsDTO } from 'src/common/list-id.dto';
import { parseDate } from 'src/common/partDateTime';
import { ResponseDTO } from 'src/common/response.dto';
import { DATA_STILL_IN_WAREHOUSE } from 'src/constants/delete-error.constants';
import { DECREMENT, INCREMENT, STATUS_UPDATE_CAPACITY_ARRAY } from 'src/constants/product.constants';
import { MasterProductMethod } from 'src/master-products/enums/master-product-method';
import { MasterProductsService } from 'src/master-products/master-products.service';
import { ProductCategorysService } from 'src/product-categorys/product-categorys.service';
import { RecommendDTO } from 'src/racks/dto/recommend-rack.dto';
import { Rack } from 'src/racks/entities/rack.entity';
import { RacksService } from 'src/racks/racks.service';
import { ReceiptsService } from 'src/receipts/receipts.service';
import { SuppliersService } from 'src/suppliers/suppliers.service';
import { ZoneService } from 'src/zone/zone.service';
import { Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductFilter } from './dto/filter-product.dto';
import { RackProductDTO } from './dto/rack-product.dto';
import { RecommendBatchEntry, RecommendBatchRequest, RecommendBatchResponse, RecommendBatchSuggestion } from './dto/recommend-batch.dto';
import { RecommendProduct } from './dto/recommend-product.dto';
import { ProductDTO, ProductScanResponse } from './dto/response-product.dto';
import { ScanProduct } from './dto/scan-product.dto';
import { SplitProduct } from './dto/split-product.dto';
import { SuggestLocationItem, SuggestLocationProduct } from './dto/suggest-location.dto';
import { UpdateLocationProduct } from './dto/update-location-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProducts } from './dto/update-products.dto';
import { Product } from './entities/product.entity';
import { ProductStatus } from './enum/product-status.enum';
import { formatNewProductLotCode, keywordMatchesProductCodeExactLookup, productLotCodeStemForRelatedQuery } from './product-lot-code';

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

    // Remove empty string values for foreign keys to prevent TypeORM errors
    const cleanEmptyField = (value: any) => {
      if (value === null || value === undefined) return true;
      if (typeof value === 'string' && value.trim() === '') return true;
      return false;
    };

    // Clean up all optional foreign key fields - iterate through all keys
    Object.keys(createProductDto).forEach(key => {
      const value = createProductDto[key];
      // Check if it's a potential ID field (ends with Id or is a known foreign key)
      if (key.endsWith('Id') || ['idRackReallocate'].includes(key)) {
        if (cleanEmptyField(value)) {
          delete createProductDto[key];
        }
      }
      // Also clean relation fields that are empty strings (but keep objects)
      const relationFields = ['supplier', 'rack', 'zone', 'block', 'masterProduct', 'productCategory'];
      if (relationFields.includes(key) && typeof value === 'string' && value.trim() === '') {
        delete createProductDto[key];
      }
    });

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
      newProduct.rack = await this.racksService.findOneByCode(createProductDto?.rackCode, newProduct.warehouseId);

    if (createProductDto.status1) {
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
    res.code = formatNewProductLotCode(res.warehouseId, res.id);
    const data = await this.productRepository.save(res);
    if (data) {
      if (data.masterProduct && data.status === ProductStatus.STORED) {
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


      const codeTemp = productLotCodeStemForRelatedQuery(product?.code);

      const count = await this.productRepository.createQueryBuilder("product")
        .where("product.code LIKE :code", { code: `${codeTemp}%` })
        .andWhere("product.status NOT IN (:...status)", { status: [ProductStatus.ERROR, ProductStatus.LOST, ProductStatus.DISABLE] })
        .getCount();
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

    const out = await this.productRepository.createQueryBuilder("product")
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

    if (product?.receipt?.id != null) {
      try {
        await this.receiptsService.completeReceiptIfAllProductsTemporary(product.receipt.id);
      } catch (err) {
        this.logger.warn(`completeReceiptIfAllProductsTemporary: ${err}`);
      }
    }

    return out;
  }

  async findListProductByMasterProductId(recommendProduct: RecommendProduct): Promise<ResponseDTO> {
    this.logger.log(`Request to get products by masterProductId: ${recommendProduct.masterProductId}`);
    const queryBuilder = this.productRepository.createQueryBuilder("product");

    if (recommendProduct.masterProductId == null) {
      throw new RpcException('Master Product Id is required');
    }

    queryBuilder
      .leftJoinAndSelect('product.masterProduct', 'masterProduct')
      .where('masterProduct.id = :masterProductId', { masterProductId: recommendProduct.masterProductId });

    if (recommendProduct.warehouseId) {
      queryBuilder.andWhere('product.warehouseId = :warehouseId', { warehouseId: recommendProduct.warehouseId });
    }

    queryBuilder.andWhere('product.status = :status', { status: ProductStatus.STORED });

    const skippedItems = (recommendProduct?.page - 1) * recommendProduct?.limit;

    if (!isNaN(skippedItems)) {
      queryBuilder.skip(skippedItems).take(recommendProduct?.limit);
    }

    queryBuilder
      .leftJoinAndSelect('masterProduct.suppliers', 'suppliers')
      .leftJoinAndSelect('masterProduct.productCategory', 'productCategory')
      .leftJoinAndSelect('product.rack', 'rack')
      .leftJoinAndSelect('product.block', 'block')
      .leftJoinAndSelect('product.supplier', 'supplier')
      .leftJoinAndSelect('rack.shelf', 'shelf')
      .leftJoinAndSelect('product.receipt', 'receipt')
      .leftJoinAndSelect('product.zone', 'zone');

    const masterProduct = await this.masterProductsService.findOne(recommendProduct.masterProductId);

    if (masterProduct?.method === MasterProductMethod.FIFO) {
      queryBuilder.orderBy("product.storageDate", "ASC", "NULLS LAST")
        .addOrderBy("rack.id", "ASC");
    } else if (masterProduct?.method === MasterProductMethod.LIFO) {
      queryBuilder.orderBy("product.storageDate", "DESC", "NULLS LAST")
        .addOrderBy("rack.id", "ASC");
    } else if (masterProduct?.method === MasterProductMethod.FEFO) {
      queryBuilder.orderBy("product.expireDate", "ASC", "NULLS LAST")
        .addOrderBy("rack.id", "ASC");
    } else {
      queryBuilder.orderBy("rack.id", "ASC");
    }

    const data = await queryBuilder.getManyAndCount();

    const res = new ResponseDTO();
    res.totalItem = data[1];
    res.data = data[0];

    const cap = recommendProduct.quantity ?? Number.MAX_SAFE_INTEGER;
    let total = 0;
    const dataRecommend = [];
    let count = 0;
    for (const item of res.data) {
      if (total < cap) {
        total += item.totalQuantity;
        count++;
        dataRecommend.push(item);
      }
    }
    res.data = dataRecommend;
    res.totalItem = count;
    return res;
  }

  /**
   * Batch recommend: aggregate available bins for many masterProductIds in
   * one round-trip. Avoids the N sequential HTTP requests the SPA was making.
   *
   * Frontend contract:
   *   POST /products/recommend-batch
   *   body: { warehouseId, items: [{ masterProductId, quantity? }] }
   *   returns: { warehouseId, results: [{ masterProductId, suggestedLocations[], totalAvailable }] }
   */
  async recommendBatch(payload: RecommendBatchRequest): Promise<RecommendBatchResponse> {
    this.logger.log(`Request to recommend batch: ${payload?.items?.length || 0} items, wh=${payload?.warehouseId}`);
    const response: RecommendBatchResponse = {
      warehouseId: payload?.warehouseId,
      results: [],
    };
    if (!payload?.items?.length) {
      return response;
    }

    for (const item of payload.items) {
      if (item?.masterProductId == null) {
        continue;
      }
      const entry: RecommendBatchEntry = {
        masterProductId: Number(item.masterProductId),
        requestedQuantity: item.quantity,
        totalAvailable: 0,
        suggestedLocations: [],
      };

      const sub = await this.findListProductByMasterProductId({
        masterProductId: Number(item.masterProductId),
        quantity: item.quantity,
        warehouseId: payload.warehouseId,
        page: 1,
        limit: 1000,
      });

      const list: Product[] = Array.isArray(sub?.data) ? (sub.data as Product[]) : [];
      for (const p of list) {
        const suggestion: RecommendBatchSuggestion = {
          productId: p.id,
          zone: (p as any).zone?.name || '',
          block: (p as any).block?.name || p.rack?.shelf?.block?.name || '',
          shelf: p.rack?.shelf?.name || '',
          rack: p.rack?.code || '',
          availableQuantity: p.totalQuantity || 0,
          storageDate: (p as any).storageDate,
          expireDate: (p as any).expireDate,
        };
        entry.suggestedLocations.push(suggestion);
        entry.totalAvailable += suggestion.availableQuantity;
      }
      response.results.push(entry);
    }
    return response;
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
      queryBuilder.leftJoin('product.block', 'blockFilter');
      queryBuilder.andWhere('blockFilter.id = :blockId', { blockId: productFilter.blockId });
    }

    if (productFilter.orderId) {
      queryBuilder.andWhere("product.orderId = :orderId", { orderId: productFilter.orderId })
    }

    if (productFilter.group) {
      queryBuilder.andWhere("product.group = :group", { group: productFilter.group })
    }

    if (productFilter.masterProductId) {
      queryBuilder.leftJoin('product.masterProduct', 'masterProductIdFilter');
      queryBuilder.andWhere('masterProductIdFilter.id = :masterProductId', { masterProductId: productFilter.masterProductId });
    }

    if (productFilter.keyword) {
      if (keywordMatchesProductCodeExactLookup(productFilter.keyword)) {
        queryBuilder.andWhere("product.code = :keyword", { keyword: productFilter.keyword })
      } else {
        queryBuilder.leftJoin('product.masterProduct', 'masterProductKeyword');
        queryBuilder.andWhere('masterProductKeyword.name LIKE :keyword', { keyword: `%${productFilter.keyword}%` });
      }
    }

    if (productFilter.packageCode) {
      queryBuilder.andWhere("product.packageCode = :packageCode", { packageCode: productFilter.packageCode })
    }

    if (productFilter.multipleStatus) {
      const statusArr = productFilter?.multipleStatus?.split(",");
      queryBuilder.andWhere("product.status IN (:...statusArr)", { statusArr: statusArr })
    }

    const categoryIds: number[] = [];
    const rawCategoryIds = productFilter.productCategoryIds;
    if (rawCategoryIds != null && String(rawCategoryIds).trim() !== '') {
      for (const part of String(rawCategoryIds).split(',')) {
        const n = Number(part.trim());
        if (Number.isFinite(n) && n > 0) categoryIds.push(n);
      }
    } else if (productFilter.productCategoryId != null) {
      const n = Number(productFilter.productCategoryId);
      if (Number.isFinite(n) && n > 0) categoryIds.push(n);
    }
    if (categoryIds.length > 0) {
      queryBuilder.leftJoin('product.masterProduct', 'masterProductCatFilter');
      queryBuilder.leftJoin('masterProductCatFilter.productCategory', 'productCategoryFilter');
      queryBuilder.andWhere('productCategoryFilter.id IN (:...categoryIds)', { categoryIds });
    }

    if (productFilter.supplierId) {
      queryBuilder.leftJoin('product.masterProduct', 'masterProductSupFilter');
      queryBuilder.leftJoin('masterProductSupFilter.suppliers', 'suppliersFilter');
      queryBuilder.andWhere('suppliersFilter.id = :supplierId', { supplierId: productFilter.supplierId });
    }

    if (productFilter.rackId) {
      queryBuilder.leftJoin('product.rack', 'rackIdFilter');
      queryBuilder.andWhere('rackIdFilter.id = :rackId', { rackId: productFilter.rackId });
    }

    if (productFilter.rackCode) {
      queryBuilder.leftJoin('product.rack', 'rackCodeFilter');
      queryBuilder.andWhere('rackCodeFilter.code = :rackCode', { rackCode: productFilter.rackCode });
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
    const product = await this.productRepository.findOne(id, { relations: ['supplier'] });
    if (product) {
      return product;
    }
    throw new RpcException('Not found product');
  }

  async update(id: number, currentProduct: UpdateProductDto) {
    this.logger.log(`Request to update product: ${id}`);
    const productBeforeUpdate = await this.productRepository.findOne(id, { relations: ["masterProduct", "rack"] });
    if (!productBeforeUpdate) throw new HttpException('Not found product', HttpStatus.NOT_FOUND);

    await this.resolveRackFromUpdateDto(currentProduct, productBeforeUpdate);

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
      const revertReallocation =
        productBeforeUpdate.status === ProductStatus.REALLOCATE &&
        currentProduct.status === ProductStatus.STORED &&
        productBeforeUpdate.idRackReallocate != null &&
        !Number.isNaN(Number(productBeforeUpdate.idRackReallocate)) &&
        Number(productBeforeUpdate.idRackReallocate) !== 0 &&
        currentProduct?.rack?.id != null &&
        productBeforeUpdate?.rack?.id != null &&
        Number(currentProduct.rack.id) === Number(productBeforeUpdate.idRackReallocate) &&
        Number(productBeforeUpdate.rack.id) !== Number(productBeforeUpdate.idRackReallocate);

      if (revertReallocation) {
        const cap = productBeforeUpdate.masterProduct?.capacity;
        if (cap != null) {
          const newRackId = productBeforeUpdate.rack.id;
          const newRack = await this.racksService.findOne(newRackId);
          const vol = cap * productBeforeUpdate.totalQuantity;
          if (newRack && newRack.usedCapacity >= vol) {
            await this.updateRackUsedCapacity(cap, newRackId, productBeforeUpdate.totalQuantity, DECREMENT);
          }
        }
        // Original rack was not decremented when entering REALLOCATE; do not INCREMENT it here or capacity overflows.
      } else if (
        productBeforeUpdate?.rack?.id != null &&
        currentProduct?.rack?.id != null &&
        Number(productBeforeUpdate.rack.id) !== Number(currentProduct.rack.id)
      ) {
        const newRackId = Number(currentProduct.rack.id);
        const oldRackId = Number(productBeforeUpdate.rack.id);
        if (Number.isFinite(newRackId) && newRackId > 0 && STATUS_UPDATE_CAPACITY_ARRAY.includes(currentProduct.status)) {
          await this.updateRackUsedCapacity(productBeforeUpdate.masterProduct.capacity,
            newRackId, currentProduct?.totalQuantity, INCREMENT);
        }
        if (
          Number.isFinite(oldRackId) &&
          oldRackId > 0 &&
          STATUS_UPDATE_CAPACITY_ARRAY.includes(productBeforeUpdate.status) &&
          currentProduct.status !== ProductStatus.REALLOCATE
        ) {
          await this.updateRackUsedCapacity(productBeforeUpdate.masterProduct.capacity,
            oldRackId, productBeforeUpdate.totalQuantity, DECREMENT);
        }
      } else {

        if (productBeforeUpdate.status !== currentProduct.status) {
          if (currentProduct.status === ProductStatus.STORED && productBeforeUpdate.status === ProductStatus.REALLOCATE) {
            const capacity = productBeforeUpdate?.masterProduct?.capacity;
            if (capacity != null) {
              let decRackId = productBeforeUpdate.idRackReallocate;
              if (decRackId == null || Number.isNaN(Number(decRackId)) || Number(decRackId) <= 0) {
                decRackId = currentProduct?.rack?.id;
              }
              if (decRackId != null && !Number.isNaN(Number(decRackId)) && Number(decRackId) > 0) {
                await this.updateRackUsedCapacity(
                  capacity,
                  Number(decRackId),
                  productBeforeUpdate.totalQuantity,
                  DECREMENT,
                );
              }
            }
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

    if (currentProduct.status === ProductStatus.LOST) {
      if (currentProduct.lostNumber > 0 && currentProduct.lostNumber < productBeforeUpdate.totalQuantity) {
        const splitProduct = new SplitProduct();
        splitProduct.id = currentProduct.id;
        splitProduct.quantity = currentProduct.lostNumber;
        splitProduct.isUpdateCode = true;
        const split = await this.splitProduct(splitProduct);
        split.status = ProductStatus.LOST;
        split.description = currentProduct.description;
        split.lostDate =
          currentProduct.lostDate != null
            ? parseDate(new Date(currentProduct.lostDate as unknown as string))
            : parseDate(new Date());
        await this.productRepository.update(split.id, split);
        currentProduct.status = productBeforeUpdate.status;
        currentProduct.description = '';
        currentProduct.totalQuantity = productBeforeUpdate.totalQuantity - currentProduct.lostNumber;
        if (productBeforeUpdate?.rack?.id)
          await this.updateRackUsedCapacity(productBeforeUpdate?.masterProduct?.capacity, productBeforeUpdate?.rack?.id, currentProduct.lostNumber, DECREMENT);
      }
    }

    if (productBeforeUpdate.status === ProductStatus.ERROR && currentProduct.status !== ProductStatus.ERROR && currentProduct.status !== ProductStatus.LOST) {

      const codeTemp = productLotCodeStemForRelatedQuery(productBeforeUpdate?.code);

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
      const codeTemp = productLotCodeStemForRelatedQuery(productBeforeUpdate.code);
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
    delete currentProduct.locations;

    await this.productRepository.update(id, currentProduct);
    const updateProduct = await this.productRepository.findOne(id, { relations: ["masterProduct", "block", "rack", "receipt", "zone"] });
    if (updateProduct?.receipt?.id != null) {
      try {
        await this.receiptsService.completeReceiptIfAllProductsTemporary(updateProduct.receipt.id);
      } catch (err) {
        this.logger.warn(`completeReceiptIfAllProductsTemporary: ${err}`);
      }
    }
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
    }
    if ((product.totalQuantity ?? 0) > 0) {
      throw new RpcException(DATA_STILL_IN_WAREHOUSE);
    }
    product.status = ProductStatus.DISABLE;
    await this.productRepository.save(product);
    if (product?.rack) {
      const rack = product?.rack;
      const master = product?.masterProduct?.capacity;
      this.updateRackUsedCapacity(master, rack?.id, product?.totalQuantity, DECREMENT);
    }
  }

  async updateRackUsedCapacity(masterCapacity: number, rackId: number, totalQuantity: number, typeUpdate: string) {
    const rid = Number(rackId);
    if (!Number.isFinite(rid) || rid <= 0) {
      this.logger.warn(`updateRackUsedCapacity skipped: invalid rackId (${rackId})`);
      return;
    }
    const cap = Number(masterCapacity);
    const qty = Number(totalQuantity);
    if (!Number.isFinite(cap) || !Number.isFinite(qty) || qty < 0) {
      this.logger.warn(
        `updateRackUsedCapacity skipped: invalid capacity or quantity (capacity=${masterCapacity}, qty=${totalQuantity})`,
      );
      return;
    }
    const total = cap * qty;
    if (!Number.isFinite(total) || total < 0) {
      this.logger.warn(`updateRackUsedCapacity skipped: non-finite total (${total})`);
      return;
    }
    const rack = await this.racksService.findOne(rid);
    if (!rack) throw new RpcException('Not found rack');

    if (typeUpdate === INCREMENT && rack.capacity >= total + rack.usedCapacity) {
      rack.usedCapacity += total;
      return await this.racksService.update(rack.id, rack);
    }
    if (typeUpdate === DECREMENT && rack.usedCapacity >= total) {
      rack.usedCapacity -= total;
      return await this.racksService.update(rack.id, rack);
    }
    if (typeUpdate === DECREMENT && rack.usedCapacity < total) {
      this.logger.warn(
        `updateRackUsedCapacity: DECREMENT skipped for rack ${rid} (usedCapacity=${rack.usedCapacity} < volume=${total})`,
      );
      return rack;
    }
    throw new RpcException('Not enough capacity');
  }

  async removes(idsDTO: IdsDTO) {
    this.logger.log(`Request to removes products`);
    for (const id of idsDTO.ids) {
      this.remove(Number(id));
    }
  }

  async updates(updateProducts: UpdateProducts) {
    this.logger.log(`Request to updates products`);

    let rack: Rack | undefined;
    if (updateProducts.rackId != null && !Number.isNaN(Number(updateProducts.rackId))) {
      rack = await this.racksService.findOne(Number(updateProducts.rackId));
    } else if (updateProducts.locations?.length) {
      const firstId = updateProducts.ids?.[0];
      if (firstId == null) {
        throw new RpcException('ids required');
      }
      const proSample = await this.productRepository.findOne(Number(firstId));
      if (!proSample) {
        throw new RpcException('Not found product');
      }
      const loc = updateProducts.locations[0];
      const resolved = await this.racksService.resolveRackFromLocationHints(proSample.warehouseId, {
        blockRef: String(loc.block).trim(),
        shelfName: String(loc.shelf).trim(),
        rackCode: String(loc.rack).trim(),
      });
      if (!resolved) {
        throw new RpcException('Not found rack for block/shelf/rack in this warehouse');
      }
      rack = resolved;
    }

    const products = [];
    for (let id of updateProducts.ids) {
      const pro = await this.productRepository.findOne(id, { relations: ['masterProduct', 'block', 'rack', 'receipt', 'zone'] });
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

  /**
   * Read-only suggestion: find suitable rack for each product without
   * mutating DB (no rack.usedCapacity bump, no product.rack write).
   * Used by inbound "Suggest location" UI so users can preview/confirm.
   */
  async suggestLocation(payload: SuggestLocationProduct): Promise<SuggestLocationItem[]> {
    this.logger.log(`Request to suggest location (read-only): ${payload?.productIds?.length || 0} products`);
    if (!payload?.productIds?.length) {
      return [];
    }

    const recommendDTO = new RecommendDTO();
    const reserved = new Map<number, number>(); // rackId -> reserved capacity within this batch
    const results: SuggestLocationItem[] = [];

    for (const id of payload.productIds) {
      const product = await this.productRepository.createQueryBuilder('product')
        .where('product.id = :id', { id: Number(id) })
        .leftJoinAndSelect('product.masterProduct', 'masterProduct')
        .leftJoinAndSelect('masterProduct.productCategory', 'productCategory')
        .leftJoinAndSelect('productCategory.parentProductCategory', 'parentProductCategory')
        .getOne();
      if (!product?.masterProduct) {
        continue;
      }

      const requiredCapacity = (product.totalQuantity || 0) * (product.masterProduct.capacity || 0);
      recommendDTO.totalCapacity = requiredCapacity;
      recommendDTO.parentProductCategoryId = product.masterProduct.productCategory?.parentProductCategory?.id;
      recommendDTO.warehouseId = product.warehouseId;

      let rack: Rack | null = null;
      try {
        rack = await this.racksService.recommendRackWithFallback(recommendDTO);
      } catch {
        rack = null;
      }
      if (!rack) {
        continue;
      }

      // Soft reservation within this batch: avoid suggesting the same rack
      // beyond its remaining capacity when multiple products are in one call.
      const alreadyReserved = reserved.get(rack.id) || 0;
      const remaining = rack.capacity - rack.usedCapacity - alreadyReserved;
      if (remaining < requiredCapacity) {
        // Try fallback ignoring this rack by skipping; for now, skip to keep code minimal.
        continue;
      }
      reserved.set(rack.id, alreadyReserved + requiredCapacity);

      results.push({
        productId: Number(id),
        rackId: rack.id,
        rack: rack.code,
        shelf: rack.shelf?.name,
        block: rack.shelf?.block?.name,
        zone: undefined,
        availableCapacity: rack.capacity - rack.usedCapacity - alreadyReserved,
        requiredCapacity,
      });
    }

    return results;
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
      const rack = await this.racksService.recommendRackWithFallback(recommendRack);

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

    scanProduct.page = Number(scanProduct?.page) || 1;
    scanProduct.limit = Number(scanProduct?.limit) || 1000;
    if (scanProduct.productCode && (!scanProduct.productCodes?.length)) {
      scanProduct.productCodes = [String(scanProduct.productCode).trim()];
    }
    if (!scanProduct.productCodes) {
      scanProduct.productCodes = [];
    }
    if (!scanProduct.packageCodes) {
      scanProduct.packageCodes = [];
    }
    if (!scanProduct.barCodes) {
      scanProduct.barCodes = [];
    }
    if (!scanProduct.type) {
      scanProduct.type = ScanType.OUTBOUND_PICKING;
    }

    // First check if products exist at all (REALLOCATE: allow match by line code OR master barCode)
    if (scanProduct.productCodes?.length > 0) {
      const existQb = this.productRepository
        .createQueryBuilder('product')
        .andWhere('product.warehouseId = :warehouseId', { warehouseId: scanProduct.warehouseId });

      if (scanProduct.type === ScanType.REALLOCATE) {
        existQb.leftJoinAndSelect('product.masterProduct', 'mpExist');
        existQb.andWhere('(product.code IN (:...codes) OR mpExist.barCode IN (:...codes))', {
          codes: scanProduct.productCodes
        });
      } else {
        existQb.andWhere('product.code IN (:...codes)', { codes: scanProduct.productCodes });
      }

      const existingProducts = await existQb.getMany();

      const matchedTokens = new Set<string>();
      for (const p of existingProducts) {
        if (p.code) matchedTokens.add(p.code);
        if (p.masterProduct?.barCode) matchedTokens.add(p.masterProduct.barCode);
      }
      const nonExistentCodes = scanProduct.productCodes.filter((code) => !matchedTokens.has(code));

      if (nonExistentCodes.length > 0) {
        const responseScans = new ProductScanResponse();
        responseScans.errList = nonExistentCodes;
        responseScans.successList = [];
        responseScans.errorType = 'NOT_FOUND';
        return responseScans;
      }
    }

    const queryBuilder = this.productRepository.createQueryBuilder('product');

    if (scanProduct.type) {
      if (scanProduct.productCodes) {
        if (scanProduct.type === ScanType.REALLOCATE) {
          queryBuilder.leftJoin('product.masterProduct', 'mpRel');
          queryBuilder.where('(product.code IN (:...codes) OR mpRel.barCode IN (:...codes))', {
            codes: scanProduct.productCodes
          });
        } else {
          queryBuilder.where('product.code IN (:...codes)', { codes: scanProduct.productCodes });
        }
      }

      if (scanProduct.packageCodes && scanProduct?.packageCodes?.length > 0) {
        queryBuilder.andWhere("product.packageCode IN (:...packageCodes)", { packageCodes: scanProduct.packageCodes });
      }

      if (scanProduct.barCodes && scanProduct?.barCodes?.length > 0) {
        queryBuilder.leftJoin('product.masterProduct', 'masterProductBarFilter');
        queryBuilder.andWhere('masterProductBarFilter.barCode IN (:...barCodes)', { barCodes: scanProduct.barCodes });
        queryBuilder.andWhere('product.status IN (:...status)', { status: [ProductStatus.PICKING] });
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
      .getMany();

    const matchedRequestTokens = new Set<string>();
    for (const element of data) {
      if (element.code) matchedRequestTokens.add(element.code);
      if (element.masterProduct?.barCode) matchedRequestTokens.add(element.masterProduct.barCode);
    }
    let difference = scanProduct?.productCodes?.filter((x) => !matchedRequestTokens.has(x));
    const codePackages: string[] = [];
    for (const element of data) {
      codePackages.push(element.packageCode);
    }
    const res = [];
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
    responseScans.errorType = difference?.length > 0 ? 'INVALID_STATUS' : undefined;

    if (scanProduct.locations?.[0]) {
      const loc = scanProduct.locations[0];
      if (!scanProduct.warehouseId) {
        throw new RpcException('warehouseId is required');
      }
      const rak = await this.racksService.resolveRackFromLocationHints(Number(scanProduct.warehouseId), {
        blockRef: String(loc.block).trim(),
        shelfName: String(loc.shelf).trim(),
        rackCode: String(loc.rack).trim(),
      });
      if (rak?.id) {
        responseScans.rack = rak;
      } else {
        throw new RpcException('Not found rack for block/shelf/rack in this warehouse');
      }
    } else if (
      scanProduct.rackCode?.trim() ||
      scanProduct.location?.trim() ||
      scanProduct.blockRef?.trim() ||
      scanProduct.shelfName?.trim()
    ) {
      if (!scanProduct.warehouseId) {
        throw new RpcException('warehouseId is required');
      }
      const rak = await this.racksService.resolveRackFromLocationHints(Number(scanProduct.warehouseId), {
        rackCode: (scanProduct.rackCode || scanProduct.location)?.trim(),
        blockRef: scanProduct.blockRef?.trim(),
        shelfName: scanProduct.shelfName?.trim(),
      });
      if (rak?.id) {
        responseScans.rack = rak;
      } else {
        throw new RpcException('Not found rack');
      }
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

  async getProductsByStatus(status: ProductStatus, warehouseId?: number): Promise<Product[]> {
    this.logger.log(`Request to get products by status: ${status}`);

    const queryBuilder = this.productRepository.createQueryBuilder('product')
      .leftJoinAndSelect('product.masterProduct', 'masterProduct')
      .leftJoinAndSelect('masterProduct.productCategory', 'productCategory')
      .leftJoinAndSelect('masterProduct.suppliers', 'suppliers')
      .leftJoinAndSelect('product.rack', 'rack')
      .leftJoinAndSelect('rack.shelf', 'shelf')
      .leftJoinAndSelect('product.block', 'block')
      .leftJoinAndSelect('product.zone', 'zone')
      .leftJoinAndSelect('product.supplier', 'supplier')
      .leftJoinAndSelect('product.receipt', 'receipt')
      .where('product.status = :status', { status });

    if (warehouseId) {
      queryBuilder.andWhere('product.warehouseId = :warehouseId', { warehouseId });
    }

    return queryBuilder.getMany();
  }

  async getExpiredProducts(filter: any): Promise<ResponseDTO> {
    this.logger.log(`Request to get expired products`);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    const queryBuilder = this.productRepository.createQueryBuilder('product')
      .leftJoinAndSelect('product.masterProduct', 'masterProduct')
      .leftJoinAndSelect('masterProduct.productCategory', 'productCategory')
      .leftJoinAndSelect('masterProduct.suppliers', 'suppliers')
      .leftJoinAndSelect('product.block', 'block')
      .leftJoinAndSelect('product.rack', 'rack')
      .leftJoinAndSelect('product.supplier', 'supplier')
      .leftJoinAndSelect('rack.shelf', 'shelf')
      .leftJoinAndSelect('product.receipt', 'receipt')
      .leftJoinAndSelect('product.zone', 'zone')
      .where('product.expireDate IS NOT NULL');

    // Filter by warehouse if provided
    if (filter.warehouseId) {
      queryBuilder.andWhere('product.warehouseId = :warehouseId', { warehouseId: filter.warehouseId });
    }

    // Filter by expire date - products that have expired
    if (filter.includeToday === true) {
      // Include products expiring today or already expired
      queryBuilder.andWhere('product.expireDate <= :today', { today });
    } else {
      // Only products that have already expired (before today)
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      queryBuilder.andWhere('product.expireDate < :today', { today });
    }

    // Exclude disabled products
    queryBuilder.andWhere('product.status != :status', { status: ProductStatus.DISABLE });

    // Order by expire date (oldest first)
    queryBuilder.orderBy('product.expireDate', 'ASC');

    // Apply pagination
    const skippedItems = (filter?.page - 1) * filter?.limit;
    if (!isNaN(skippedItems)) {
      queryBuilder
        .skip(skippedItems)
        .take(filter?.limit);
    }

    const data = await queryBuilder.getManyAndCount();
    
    const res = new ResponseDTO();
    res.totalItem = data[1];
    res.data = data[0];
    
    return res;
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

  private async resolveRackFromUpdateDto(
    currentProduct: UpdateProductDto,
    productBeforeUpdate: Product,
  ): Promise<void> {
    const warehouseId = Number(currentProduct.warehouseId ?? productBeforeUpdate.warehouseId);

    const loc0 = currentProduct.locations?.[0];
    if (
      loc0?.block != null &&
      String(loc0.block).trim() !== '' &&
      loc0?.shelf != null &&
      String(loc0.shelf).trim() !== '' &&
      loc0?.rack != null &&
      String(loc0.rack).trim() !== ''
    ) {
      const resolved = await this.racksService.resolveRackFromLocationHints(warehouseId, {
        blockRef: String(loc0.block).trim(),
        shelfName: String(loc0.shelf).trim(),
        rackCode: String(loc0.rack).trim(),
      });
      if (resolved) {
        currentProduct.rack = resolved;
        return;
      }
      throw new RpcException('Not found rack for block/shelf/rack in this warehouse');
    }

    const rawBlock = currentProduct.block as Block | string | undefined;
    const blockRef =
      (currentProduct.blockRef != null && String(currentProduct.blockRef).trim()) ||
      (typeof rawBlock === 'string' && rawBlock.trim()) ||
      (typeof rawBlock === 'object' &&
        rawBlock != null &&
        rawBlock.name != null &&
        String(rawBlock.name).trim()) ||
      (typeof rawBlock === 'object' &&
        rawBlock != null &&
        rawBlock.code != null &&
        String(rawBlock.code).trim()) ||
      undefined;

    const shelfName =
      (currentProduct.shelfName != null && String(currentProduct.shelfName).trim()) ||
      ((currentProduct.rack as Rack)?.shelf != null &&
        String((currentProduct.rack as Rack).shelf?.name || '').trim()) ||
      undefined;

    const rackCodeField = currentProduct.rackCode != null ? String(currentProduct.rackCode).trim() : '';
    const rackCodeFromNested =
      (currentProduct.rack as Rack)?.code != null ? String((currentProduct.rack as Rack).code).trim() : '';
    const rackCodeHint = rackCodeField || rackCodeFromNested;

    if (
      currentProduct.rackId === null &&
      rackCodeField === '' &&
      !rackCodeFromNested &&
      !blockRef &&
      !shelfName
    ) {
      currentProduct.rack = null;
      return;
    }

    if (rackCodeField !== '' || shelfName || blockRef) {
      const resolved = await this.racksService.resolveRackFromLocationHints(warehouseId, {
        rackCode: rackCodeHint || undefined,
        blockRef,
        shelfName,
      });
      if (resolved) {
        currentProduct.rack = resolved;
        return;
      }
    }

    if (currentProduct.rackId === null) {
      currentProduct.rack = null;
      return;
    }

    const directId =
      currentProduct.rackId != null &&
      String(currentProduct.rackId).trim() !== '' &&
      Number.isFinite(Number(currentProduct.rackId)) &&
      Number(currentProduct.rackId) > 0
        ? Number(currentProduct.rackId)
        : null;
    if (directId != null) {
      currentProduct.rack = await this.racksService.findOne(directId);
      return;
    }
    const nestedId = currentProduct.rack?.id;
    if (
      nestedId != null &&
      String(nestedId).trim() !== '' &&
      Number.isFinite(Number(nestedId)) &&
      Number(nestedId) > 0
    ) {
      currentProduct.rack = await this.racksService.findOne(Number(nestedId));
      return;
    }

    if (rackCodeField !== '' || shelfName || blockRef) {
      throw new RpcException('Not found rack');
    }
  }

}

