import { forwardRef, HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import * as moment from 'moment';
import { BufferedFile } from 'src/common/buffered-file.dto';
import { ResponseDTO } from 'src/common/response.dto';
import { SUPPLIER_CODE_PATTERN } from 'src/constants/supplier.constants';
import { MasterProductFilter } from 'src/master-products/dto/filter-master-product.dto';
import { MasterProductsService } from 'src/master-products/master-products.service';
import { ProductCategory } from 'src/product-categorys/entities/product-category.entity';
import { ProductCategorysService } from 'src/product-categorys/product-categorys.service';
import { ProductFilter } from 'src/product/dto/filter-product.dto';
import { ProductService } from 'src/product/product.service';
import { Repository } from 'typeorm';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { SupplierFilter } from './dto/filter-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { Supplier } from './entities/supplier.entity';
import { SupplierStatus } from './enums/supplier-status.enum';
import * as fs from 'fs';
import readXlsxFile from 'read-excel-file/node';
import { parseDate } from 'src/common/partDateTime';

@Injectable()
export class SuppliersService {

  private readonly logger = new Logger(SuppliersService.name);

  constructor(
    @InjectRepository(Supplier)
    private supplierRepository: Repository<Supplier>,

    @Inject(forwardRef(() => ProductCategorysService))
    private readonly productCategorysService: ProductCategorysService,
    @Inject(forwardRef(() => MasterProductsService))
    private readonly materProductsService: MasterProductsService,
    @Inject(forwardRef(() => ProductService))
    private readonly productService: ProductService,
  ) { }

  async create(createSupplierDto: CreateSupplierDto) {
    this.logger.log(`Request to save Supplier: ${createSupplierDto.name}`);
      this.validateInputs(createSupplierDto);
      //await this.checkNameSupplier(createSupplierDto.name, createSupplierDto.warehouseId);
      const productCategoryIds = createSupplierDto.productCategoryIds;

      const productCategorys = [];
      if (productCategoryIds) {
        for (const id of productCategoryIds) {
          let productCategory = await this.productCategorysService.findOne(id);
          if (productCategory?.id) productCategorys.push(productCategory);
        }
      }

      // Convert date string to Date object before creating entity
      if (createSupplierDto.cooperationDay) {
        const date = moment(createSupplierDto.cooperationDay, 'DD-MM-YYYY');
        createSupplierDto.cooperationDay = date.toDate();
      }

      createSupplierDto.productCategorys = [...productCategorys];
      const newSupplier = await this.supplierRepository.create(createSupplierDto);
      const res = await this.supplierRepository.save(newSupplier);

      let sup = await this.supplierRepository.findOne(res.id);
      sup.code = this.createSupplierCode(sup.id);
      await this.supplierRepository.update(res.id, sup);

      return this.supplierRepository.findOne(sup.id, { relations: ['productCategorys'] });
  }

  createSupplierCode(id: number): string {
    const codePattern = `NCC00000`;
    let code = "";
    for (let i=0; i < codePattern.length - id.toString().length; i++) {
      code += codePattern[i];
    }
    return code + id;
  }

  async findAll(supplierFilter: SupplierFilter): Promise<ResponseDTO> {
    this.logger.log(`Request to get all Supplier`);
    const queryBuilder = this.supplierRepository.createQueryBuilder("supplier");

    if (supplierFilter.warehouseId) {
      queryBuilder.where("supplier.warehouseId = :warehouseId", { warehouseId: supplierFilter.warehouseId })
    }

    if (supplierFilter.supplierName) {
      queryBuilder.andWhere("supplier.name LIKE :supplierName", { supplierName: `%${supplierFilter.supplierName}%` })
    }

    if (supplierFilter.productCategoryId) {
      queryBuilder.leftJoinAndSelect('supplier.productCategorys', 'productCategorys')
      queryBuilder.where("productCategorys.id = :productCategoryId", { productCategoryId: supplierFilter.productCategoryId })
    }

    if (supplierFilter.status) {
      queryBuilder.andWhere('supplier.status = :status', { status: supplierFilter.status });
    } else {
      queryBuilder.andWhere('supplier.status != :status', { status: SupplierStatus.DELETE });
    }

    if (supplierFilter.startDate && supplierFilter.endDate) {
      const startDate = supplierFilter.startDate;
      const endDate = supplierFilter.endDate;
      queryBuilder.andWhere(`supplier.cooperationDay BETWEEN '${startDate}' AND '${endDate}'`)
    }

    if (supplierFilter.sortBy && supplierFilter.sortDirection) {
      if (supplierFilter.sortDirection.toUpperCase() === "DESC")
        queryBuilder.orderBy(`supplier.${supplierFilter.sortBy}`, "DESC");
      else queryBuilder.orderBy(`supplier.${supplierFilter.sortBy}`, "ASC");
    } else {
      queryBuilder.orderBy("supplier.id", "ASC");
    }

    const skippedItems = (supplierFilter?.page - 1) * supplierFilter?.limit;

    if (!isNaN(skippedItems)) {
      queryBuilder
        .skip(skippedItems)
        .take(supplierFilter?.limit)
    }
    if (!supplierFilter.productCategoryId) {
      queryBuilder.leftJoinAndSelect('supplier.productCategorys', 'productCategorys')
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
    this.logger.log(`Request to get Supplier: ${id}`);
    const supplier = await this.supplierRepository.findOne(id, { relations: ['productCategorys'] });
    if (supplier) {
      return supplier;
    }
    throw new RpcException('Not found supplier');
  }

  async update(id: number, currentSupplier: UpdateSupplierDto) {
    this.logger.log(`Request to update Supplier: ${id}`);

    if (!id) throw new RpcException('Id is required!');
    this.validateInputs(currentSupplier);
    const existed = await this.supplierRepository.findOne(id);
    if (!existed) throw new RpcException('Not found supplier');

    if (currentSupplier.name && existed.name !== currentSupplier.name){
      await this.checkNameSupplier(currentSupplier.name, currentSupplier.warehouseId);
    }
    
    let updateSupplier = { ...currentSupplier };
    delete updateSupplier.productCategoryIds;

    let productCategorys = [];
    for (const id of currentSupplier.productCategoryIds) {
      let productCategory = await this.productCategorysService.findOne(id);
      if (productCategory?.id) productCategorys.push(productCategory);
    }
    if (currentSupplier.status == SupplierStatus.DISABLE) {

      const pros = new ProductFilter();
      pros.supplierId = id;
      const prosTmp = await this.productService.findAll(pros);
      if (prosTmp?.data?.length > 0) {
        throw new RpcException('Because there are still products in warehouse, so it can not switch to disable status');
      }

      const masterProductFilers = new MasterProductFilter();
      masterProductFilers.supplierId = id;
      const masterProductTmp = await this.materProductsService.findAll(masterProductFilers);
      if (masterProductTmp?.data?.length > 0) {
        throw new RpcException('Cannot disable!');
      }
      updateSupplier.productCategorys = productCategorys;
      updateSupplier.updateDate = parseDate(new Date());
      await this.supplierRepository.save(updateSupplier);
      return this.supplierRepository.findOne(id, { relations: ['productCategorys'] });
    }
    updateSupplier.productCategorys = productCategorys;
    updateSupplier.updateDate = parseDate(new Date());
    await this.supplierRepository.save(updateSupplier);
    return this.supplierRepository.findOne(id, { relations: ['productCategorys'] });
  }

  async remove(id: number) {
    this.logger.log(`Request to remove Supplier: ${id}`);

    const deleteResponse = await this.supplierRepository.findOne(id);
    if (!deleteResponse) {
      throw new RpcException('Not found supplier');
    }
    deleteResponse.status = SupplierStatus.DISABLE;
    this.supplierRepository.save(deleteResponse);
  }

  validateEmail(email) {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  }

  validatePhonenumber(phone) {
    var phoneno = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
    if(phone?.match(phoneno)) return true;
    else return false;
  }

  validateInputs(supplier) {
    if (supplier.email) {
      const res = this.validateEmail(supplier.email);
      if (!res) throw new RpcException({
        status: 400,
        message: 'Email incorrect format!',
        error: 'Bad Request'
      });
    }

    if (supplier.phoneNumber) {
      const res = this.validatePhonenumber(supplier.phoneNumber);
      if (!res) throw new RpcException({
        status: 400,
        message: 'Phone number incorrect format!',
        error: 'Bad Request'
      });
    }

    if (supplier.status) {
      if (!Object.values(SupplierStatus).includes(supplier.status))
        throw new RpcException({
          status: 400,
          message: 'Status incorrect!',
          error: 'Bad Request'
        });
    }

    if (supplier.cooperationDay) {
      // First check if the date string matches the required format
      const dateRegex = /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-\d{4}$/;
      if (!dateRegex.test(supplier.cooperationDay)) {
        throw new RpcException({
          status: 400,
          message: 'Invalid Date format. Please use DD-MM-YYYY format',
          error: 'Bad Request'
        });
      }

      // Then validate if it's a valid date
      const date = moment(supplier.cooperationDay, 'DD-MM-YYYY');
      if (!date.isValid()) {
        throw new RpcException({
          status: 400,
          message: 'Invalid Date. Please provide a valid date in DD-MM-YYYY format',
          error: 'Bad Request'
        });
      }
      supplier.cooperationDay = date.toDate();
    }
  }

  async checkNameSupplier(name: string, warehouseId: number) {
    const queryBuilder = this.supplierRepository.createQueryBuilder("sup");
    queryBuilder.where("sup.warehouseId = :warehouseId", { warehouseId: warehouseId })
    queryBuilder.andWhere("sup.status != :status", { status: SupplierStatus.DISABLE})
    queryBuilder.andWhere("sup.name = :name", { name: name?.trim() })
    const res = await queryBuilder.getCount();
    if (res > 0) throw new RpcException(`This ${name} name already exists`);
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
                const supplier = new CreateSupplierDto();

                if(data[0])
                  supplier.name = data[0].toString();

                if(data[1])
                  supplier.email = data[1].toString();

                if(data[2])
                  supplier.address = data[2].toString();

                if(data[3])
                  supplier.phoneNumber = data[3].toString();

                if(data[4])
                  supplier.cooperationDay = moment(data[4].toString()).format('DD-MM-YYYY');

                if(data[5])
                  supplier.contractNumber = data[5].toString();

                if(data[6])
                  supplier.isActive = true;
                else supplier.isActive = false;
                
                if(data[7])
                  supplier.productCategoryIds = data[7].toString().split(",").map(x=>+x);

                supplier.warehouseId = dataExcel.warehouseId;
                res.push(await this.create(supplier));
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
