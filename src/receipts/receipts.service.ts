import { forwardRef, HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import moment from 'moment';
import { IdsDTO } from 'src/common/list-id.dto';
import { PaginationDto } from 'src/common/pagination.dto';
import { RECEIPT_CODE_PATTERN } from 'src/constants/receipt.constants';
import { ProductFilter } from 'src/product/dto/filter-product.dto';
import { Product } from 'src/product/entities/product.entity';
import { ProductService } from 'src/product/product.service';
import { SuppliersService } from 'src/suppliers/suppliers.service';
import { Repository } from 'typeorm';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { ReceiptFilter } from './dto/filter-receipt.dto';
import { UpdateReceiptDto } from './dto/update-receipt.dto';
import { Receipt } from './entities/receipt.entity';
import { ReceiptStatus } from './enums/receipt-status.enum';
import { ProductStatus } from 'src/product/enum/product-status.enum';
import { ConfirmReceipt } from './dto/confirm-receipt.dto';
import { ResponseDTO } from 'src/common/response.dto';
import { RpcException } from '@nestjs/microservices';
import { ZoneService } from 'src/zone/zone.service';
import { BufferedFile } from 'src/common/buffered-file.dto';
import readXlsxFile from 'read-excel-file/node';
import * as fs from 'fs';
import { CreateProductDto } from 'src/product/dto/create-product.dto';
import { parseDate } from 'src/common/partDateTime';

@Injectable()
export class ReceiptsService {

  private readonly logger = new Logger(ReceiptsService.name);

  constructor(
    @InjectRepository(Receipt)
    private receiptRepository: Repository<Receipt>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,

    @Inject(forwardRef(() => ProductService))
    private readonly productService: ProductService,
    @Inject(forwardRef(() => SuppliersService))
    private readonly suppliersService: SuppliersService,
    @Inject(forwardRef(() => ZoneService))
    private readonly zoneService: ZoneService,
  ) { }

  async create(createReceiptDto: CreateReceiptDto) {
    this.logger.log(`Request to save Receipt: ${createReceiptDto.creatorName}`);

    const productsTemp = createReceiptDto.products;
    delete createReceiptDto.products;

    const newReceipt = this.receiptRepository.create(createReceiptDto);
    const resTemp = await this.receiptRepository.save(newReceipt);

    if (createReceiptDto.boothCode)
      resTemp.code = createReceiptDto.boothCode + "_" + this.createReiceiptCode(resTemp.id);
    else resTemp.code = this.createReiceiptCode(resTemp.id);
    
    await this.receiptRepository.update(resTemp.id, resTemp);
    if (createReceiptDto.supplierId)
      newReceipt.supplier = await this.suppliersService.findOne(createReceiptDto?.supplierId);

    const res = await this.receiptRepository.save(newReceipt);

    let products = [];
    productsTemp?.forEach(async element => {
      products.push({ ...element, receipt: res });
    });

    await this.productService.createAll(products);

    return await this.receiptRepository.findOne(res.id, { relations: ["products"] });;
  }

  createReiceiptCode(id: number): string {
    const year = new Date().getFullYear().toString().slice(-2);
    const codePattern = `PO${year}000000`;
    let code = "";
    for (let i=0; i < codePattern.length - id.toString().length; i++) {
      code += codePattern[i];
    }
    return code + id;
  }

  async findAll(receiptFilter: ReceiptFilter): Promise<ResponseDTO> {
    this.logger.log(`Request to get all Receipt`);

    const queryBuilder = this.receiptRepository.createQueryBuilder("receipt");

    if (receiptFilter.warehouseId) {
      queryBuilder.where("receipt.warehouseId = :warehouseId", { warehouseId: receiptFilter.warehouseId })
    }

    if (receiptFilter.keyword) {
      queryBuilder.andWhere("receipt.code = :keyword", { keyword: receiptFilter.keyword })
    }

    if (receiptFilter.startDate && receiptFilter.endDate) {
      const startDate = receiptFilter.startDate;
      const endDate = receiptFilter.endDate;
      queryBuilder.andWhere(`receipt.receiptDate BETWEEN '${startDate}' AND '${endDate}'`)
    }

    if (receiptFilter.sortBy && receiptFilter.sortDirection) {
      if (receiptFilter.sortDirection.toUpperCase() === "DESC")
        queryBuilder.orderBy(`receipt.${receiptFilter.sortBy}`, "DESC");
      else queryBuilder.orderBy(`receipt.${receiptFilter.sortBy}`, "ASC");
    } else {
      queryBuilder.orderBy("receipt.id", "ASC");
    }

    if (receiptFilter.status) {
      queryBuilder.andWhere("receipt.status = :status", { status: receiptFilter.status })
    } else queryBuilder.andWhere("receipt.status != :status", { status: ReceiptStatus.DISABLE })

    const skippedItems = (receiptFilter?.page - 1) * receiptFilter?.limit;

    if (!isNaN(skippedItems)) {
      queryBuilder
        .skip(skippedItems)
        .take(receiptFilter?.limit)
    }

    const data = queryBuilder
      .leftJoinAndSelect("receipt.products", "products")
      .getManyAndCount()

    const res = new ResponseDTO();
    await data?.then(rs => {
      res.totalItem = rs[1];
      res.data = rs[0];
    });
    return res;
  }

  async findOne(id: number) {
    this.logger.log(`Request to get Receipt: ${id}`);

    const receiptExist = await this.receiptRepository.createQueryBuilder("receipt")
      .leftJoinAndSelect('receipt.products', 'products')
      .leftJoinAndSelect('products.masterProduct', 'masterProduct')
      .leftJoinAndSelect('products.block', 'block')
      .leftJoinAndSelect('products.rack', 'rack')
      .leftJoinAndSelect('products.supplier', 'supplier')
      .leftJoinAndSelect('rack.shelf', 'shelf')
      .leftJoinAndSelect('masterProduct.productCategory', 'productCategory')
      .leftJoinAndSelect('masterProduct.suppliers', 'suppliers')
      .where('receipt.id = :id', { id: id })
      .getOne();

    if (receiptExist) {
      return receiptExist;
    }
    throw new RpcException('Not found receipt');
  }

  async update(id: number, currentReceipt: UpdateReceiptDto) {
    this.logger.log(`Request to update Receipt: ${id}`);
    if (currentReceipt.supplierId)
      currentReceipt.supplier = await this.suppliersService.findOne(currentReceipt?.supplierId);

    await this.receiptRepository.update(id, currentReceipt);
    const updateReceipt = await this.receiptRepository.findOne(id);
    if (updateReceipt) {
      return updateReceipt;
    }
    throw new RpcException('Not found receipt');
  }

  async confirm(id: number, currentReceipt: ConfirmReceipt) {
    this.logger.log(`Request to confirm Receipt: ${id}`);

    const receipt = await this.receiptRepository.findOne(id, { relations: ['products'] });
    const zone = await this.zoneService.findOne(currentReceipt?.zoneId);
    if (currentReceipt?.products?.length > 0) {
      for (const element of receipt?.products) {
        for (let index = 0; index < currentReceipt?.products?.length; index++) {
          const element1 = currentReceipt?.products[index]?.id;
          const quantity = currentReceipt?.products[index]?.quantity;
          if (element1 === element?.id && quantity != 0) {
            element.status = ProductStatus.TEMPORARY;
            element.totalQuantity = quantity;
            element.recieveDate = parseDate(new Date());
            if (zone) element.zone = zone;
            await this.productRepository.update(element.id, element);
          }
        }
      }
    }
    receipt.status = ReceiptStatus.RECEIVE;
    delete receipt.products;
    await this.receiptRepository.update(receipt.id, receipt);

    if (receipt) {
      // return await this.receiptRepository.findOne(id, { relations: ['products'] });;
      return await this.receiptRepository.createQueryBuilder("receipt")
      .leftJoinAndSelect('receipt.products', 'products')
      .leftJoinAndSelect('products.masterProduct', 'masterProduct')
      .where('receipt.id = :id', { id: id })
      .getOne();
    }
    throw new RpcException('Not found receipt');
  }

  async remove(id: number) {
    this.logger.log(`Request to remove Receipt: ${id}`);

    const deleteResponse = await this.receiptRepository.findOne(id);
    if (!deleteResponse) {
      throw new RpcException('Not found receipt');
    }
    deleteResponse.status = ReceiptStatus.DISABLE;
    this.receiptRepository.save(deleteResponse);
  }

  async removes(idsDTO: IdsDTO) {
    this.logger.log(`Request to remove receipts`);
    for (const id of idsDTO.ids) {
      this.remove(Number(id));
    }
  }
}

