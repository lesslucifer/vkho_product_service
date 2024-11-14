import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { RSA_NO_PADDING } from 'constants';
import { parseDate } from 'src/common/partDateTime';
import { ResponseDTO } from 'src/common/response.dto';
import { MasterProductFilter } from 'src/master-products/dto/filter-master-product.dto';
import { MasterProductsService } from 'src/master-products/master-products.service';
import { ProductCategoryFilter } from 'src/product-categorys/dto/filter-product-category.dto';
import { ProductCategorysService } from 'src/product-categorys/product-categorys.service';
import { ProductService } from 'src/product/product.service';
import { FilterWarehouseDTO } from 'src/warehouse/dto/filter-warehouse.dto';
import { WarehouseService } from 'src/warehouse/warehouse.service';
import { Repository } from 'typeorm';
import { CreateReportDTO } from './dto/create-report.dto';
import { ReportFilter } from './dto/filter-report.dto';
import { ReportDTO } from './dto/reponse-report.dto';
import { Report } from './entities/report.entity';
import { ReportStatus } from './enums/report-status.enum';
import { ReportType } from './enums/report-type.enum';
import { ReportTypeName } from './enums/type-name.enum';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(Report)
    private reportRepository: Repository<Report>,
    @Inject(forwardRef(() => ProductCategorysService))
    private readonly productCategorysService: ProductCategorysService,
    @Inject(forwardRef(() => ProductService))
    private readonly productService: ProductService,
    @Inject(forwardRef(() => MasterProductsService))
    private readonly masterProductService: MasterProductsService,
    @Inject(forwardRef(() => MasterProductsService))
    private readonly warehouseService: WarehouseService,
  ) { }

  async create(createReportDto: CreateReportDTO) {
    this.logger.log(`Request to save report: ${createReportDto.valueProduct}`);
    const newReplenishment = await this.reportRepository.create(createReportDto);
    await this.reportRepository.save(newReplenishment);
    return newReplenishment;
  }

  async findOne(id: number) {
    this.logger.log(`Request to get Replenishment: ${id}`);
    const Report = await this.reportRepository.findOne(id);
    if (Report) {
      return Report;
    }
    throw new RpcException('Not found Replenishment');
  }

  async findOneProductMonthYear(masterProductId: number, month: number, year: number, warehouseId: number) {
    const queryBuilder = this.reportRepository.createQueryBuilder("report");
    queryBuilder.where('report.reportType = :reportType', { reportType: ReportType.PRODUCT });
    queryBuilder.andWhere('report.masterProductId = :masterProductId', { masterProductId: masterProductId });
    queryBuilder.andWhere('report.month = :month', { month: month });
    queryBuilder.andWhere('report.year = :year', { year: year });
    queryBuilder.andWhere('report.warehouseId = :warehouseId', { warehouseId: warehouseId });
    const data = queryBuilder
      .getOne();
    return data
  }

  async findOneCategoryMonthYear(productCategoryId: number, month: number, year: number, warehouseId: number) {
    const queryBuilder = this.reportRepository.createQueryBuilder("report");
    queryBuilder.where('report.reportType = :reportType', { reportType: ReportType.INVENTORY });
    queryBuilder.andWhere('report.productCategoryId = :productCategoryId', { productCategoryId: productCategoryId });
    queryBuilder.andWhere('report.month = :month', { month: month });
    queryBuilder.andWhere('report.year = :year', { year: year });
    queryBuilder.andWhere('report.warehouseId = :warehouseId', { warehouseId: warehouseId });
    const data = queryBuilder
      .getOne();
    return data
  }

  async update(id: number, currentReport: CreateReportDTO) {
    this.logger.log(`Request to update Report: ${id}`);

    const updateRe = { ...currentReport }
    await this.reportRepository.update(id, updateRe);
    const updateReport = await this.reportRepository.findOne(id);
    if (updateReport) {
      return updateReport;
    }
    throw new RpcException('Not found Report');
  }


  async findAll(reportFilter: ReportFilter): Promise<ResponseDTO> {
    var today = parseDate(new Date());
    var month = today.getMonth() + 1;
    var year = today.getFullYear();
    var thanghientai = this.getMonth(reportFilter.date);
    var namhientai = this.getYear(reportFilter.date);

    this.logger.log(`Request to get all Report`);
    const queryBuilder = this.reportRepository.createQueryBuilder("report");

    if (reportFilter.warehouseId) {
      queryBuilder.where("report.warehouseId = :warehouseId", { warehouseId: reportFilter.warehouseId })
    }

    if (reportFilter.status) {
      queryBuilder.andWhere('report.status = :status', { status: reportFilter.status });
    } else {
      queryBuilder.andWhere('report.status != :status', { status: ReportStatus.DISABLE });
    }

    if (reportFilter.sortBy && reportFilter.sortDirection) {
      if (reportFilter.sortDirection.toUpperCase() === "DESC")
        queryBuilder.orderBy(`report.${reportFilter.sortBy}`, "DESC");
      else queryBuilder.orderBy(`report.${reportFilter.sortBy}`, "ASC");
    } else {
      queryBuilder.orderBy("report.id", "ASC");
    }

    const skippedItems = (reportFilter?.page - 1) * reportFilter?.limit;

    if (!isNaN(skippedItems)) {
      queryBuilder
        .offset(skippedItems)
        .limit(reportFilter?.limit)
    }

    if (reportFilter.type === ReportType.PRODUCT) {
      // this.createReportProduct();
      const resList = [];
      const res = new ResponseDTO();
      if (namhientai != year) {
        const data = this.getReportProduct(namhientai, reportFilter.masterProductId, reportFilter.warehouseId);
        await data?.then(rs => {
          res.totalItem = rs[1];
          res.data = rs[0];
        });
        for (let index = 0; index < res.data.length; index++) {
          const element = res.data[index];
          resList.push(element);
        }
        res.data = resList;
        return res;
      }
      if (namhientai == year) {
        const data = this.getReportProduct(namhientai, reportFilter.masterProductId, reportFilter.warehouseId);
        await data?.then(rs => {
          res.totalItem = rs[1];
          res.data = rs[0];
        });
        for (let index = 0; index < res.data.length; index++) {
          const element = res.data[index];
          if (element.month != month)
            resList.push(element);
        }

        const temp = await this.productService.getOnHandProductMonth(reportFilter.masterProductId, month, namhientai, reportFilter.warehouseId);
        //Sau khi lấy ra gắng vào dto
        const dto = new ReportDTO();
        dto.valueProduct = Number(temp[0]?.value);
        dto.month = Number(temp[0]?.value2);
        dto.year = namhientai;
        dto.reportType = ReportType.PRODUCT;
        resList.push(dto);
        res.data = resList;
        return res;
      }
    }

    if (reportFilter.type === ReportType.INBOUND) {
      // this.createReportInbound();
      const resList = [];
      const res = new ResponseDTO();
      if (thanghientai != month || namhientai != year) {
        const data = this.getReportInbound(thanghientai, namhientai, reportFilter.warehouseId);
        await data?.then(rs => {
          res.totalItem = rs[1];
          res.data = rs[0];
        });
      }
      if (thanghientai == month && namhientai == year) {
        const temp = await this.productService.getReportInboundProduct(thanghientai, namhientai, reportFilter.warehouseId);
        for (let index = 0; index < temp.length; index++) {
          const element = temp[index];
          let dto = new ReportDTO();
          dto.valueProduct = Number(element?.value);
          dto.typeName = String(element?.value2);
          resList.push(dto);
        }
        res.data = resList;
      }
      return res;
    }

    if (reportFilter.type === ReportType.INVENTORY) {
      // this.createReportInventory();
      const resList = [];
      const res = new ResponseDTO();
      if (thanghientai != month || namhientai != year) {
        const data = this.getReportInventory(thanghientai, namhientai, reportFilter.warehouseId);
        await data?.then(rs => {
          res.totalItem = rs[1];
          res.data = rs[0];
          for (let index = 0; index < res?.data?.length; index++) {
            const element = res?.data[index];
          }
        });
      }
      if (thanghientai == month && namhientai == year) {
        const temp = await this.productService.getReportInventoryProduct(thanghientai, namhientai, reportFilter.warehouseId);
        for (let index = 0; index < temp.length; index++) {
          const element = temp[index];
          let dto = new ReportDTO();
          const category = await this.productCategorysService.findOne(Number(element?.value2));
          dto.valueCategory = Number(element?.value);
          dto.month = thanghientai;
          dto.productCategory = category;
          resList.push(dto);
        }
        res.data = resList;
      }
      return res;

    }

  }

  getMonth(date1: Date) {
    var date = new Date(date1);
    return date.getMonth() + 1;
  }

  getYear(date1: Date) {
    var date = new Date(date1);
    return date.getFullYear();
  }

  @Cron('0 30 23 * * *')
  async createReportProduct() {
    var today = parseDate(new Date());
    var month = today.getMonth() + 1;
    var year = today.getFullYear();
    const masterProductFilter = new MasterProductFilter();
    masterProductFilter.warehouseId
    const masterProduct = await this.masterProductService.findAll(masterProductFilter);
    for (let index = 0; index < masterProduct?.data?.length; index++) {
      const element = masterProduct?.data[index];
      let reportProduct = await this.findOneProductMonthYear(element.id, month, year, element.warehouseId);
      let dtoReport;
      dtoReport = reportProduct?.id;
      if (dtoReport) {
        const temp = await this.productService.getOnHandProductMonth(element.id, month, year, element.warehouseId);
        //Sau khi lấy ra gắng vào dto
        const dto = new ReportDTO();
        dto.id = dtoReport;
        if (Number(temp[0]?.value))
          dto.valueProduct = Number(temp[0]?.value);
        dto.month = month;
        dto.year = year;
        this.update(dtoReport, dto)
      }
      else {
        const temp = await this.productService.getOnHandProductMonth(element.id, month, year, element.warehouseId);

        const dto = new ReportDTO();
        if (Number(temp[0]?.value))
          dto.valueProduct = Number(temp[0]?.value);
        dto.month = month;
        dto.year = year;
        dto.warehouseId = element.warehouseId;
        dto.reportType = ReportType.PRODUCT;
        dto.masterProduct = element;
        
        this.create(dto);
      }
    }
  }

  @Cron('0 30 23 * * *')
  async createReportInventory() {
    
    var today = parseDate(new Date());
    var month = today.getMonth() + 1;
    var year = today.getFullYear();
    const productCategoryFilter = new ProductCategoryFilter();
    const productCategory = await this.productCategorysService.findAll(productCategoryFilter);
    for (let index = 0; index < productCategory?.data?.length; index++) {
      const element = productCategory?.data[index];
      
      let reportCategory = await this.findOneCategoryMonthYear(element.id, month, year, element.warehouseId);
     
      let dtoReport;
      dtoReport = reportCategory?.id;
      
      if (dtoReport) {
        
        const temp = await this.productService.getOnHandCategoryMonth(element.id, month, year, element.warehouseId);
        //Sau khi lấy ra gắng vào dto
        const dto = new ReportDTO();
        dto.id = dtoReport;
        if (Number(temp[0]?.value))
        dto.valueCategory = Number(temp[0]?.value);
        dto.month = month;
        dto.year = year;
        
        this.update(dtoReport, dto)
      }
      else {
        
        const temp = await this.productService.getOnHandCategoryMonth(element.id, month, year, element.warehouseId);
        //Sau khi lấy ra gắng vào dto
        const dto = new ReportDTO();
        if (Number(temp[0]?.value))
        dto.valueCategory = Number(temp[0]?.value);
        dto.month = month;
        dto.year = year;
        dto.warehouseId = element.warehouseId;
        dto.reportType = ReportType.INVENTORY;
        dto.productCategory = element;
        
        this.create(dto);
      }
    }
  }


  async getReportProduct(namhientai: number, masterProductId: number, warehouseId: number) {
    
    const queryBuilder = this.reportRepository.createQueryBuilder("report");
    queryBuilder.andWhere('report.reportType = :reportType', { reportType: ReportType.PRODUCT });
    queryBuilder.andWhere('report.masterProductId = :masterProductId', { masterProductId: masterProductId });
    queryBuilder.andWhere('report.year = :year', { year: namhientai });
    queryBuilder.andWhere('report.warehouseId = :warehouseId', { warehouseId: warehouseId });
    const data = queryBuilder
      .getManyAndCount();

    return data;
  }

  async getReportInbound(thanghientai: number, namhientai: number, warehouseId: number) {
    const queryBuilder = this.reportRepository.createQueryBuilder("report");
    queryBuilder.andWhere('report.reportType = :reportType', { reportType: ReportType.INBOUND });
    queryBuilder.andWhere('report.month = :month', { month: thanghientai });
    queryBuilder.andWhere('report.year = :year', { year: namhientai });
    queryBuilder.andWhere('report.warehouseId = :warehouseId', { warehouseId: warehouseId });
    const data = queryBuilder
      .getManyAndCount();

    return data;
  }

  async getReportInventory(thanghientai: number, namhientai: number, warehouseId: number) {
    const queryBuilder = this.reportRepository.createQueryBuilder("report");
    queryBuilder.andWhere('report.reportType = :reportType', { reportType: ReportType.INVENTORY });
    queryBuilder.andWhere('report.month = :month', { month: thanghientai });
    queryBuilder.andWhere('report.year = :year', { year: namhientai });
    queryBuilder.andWhere('report.warehouseId = :warehouseId', { warehouseId: warehouseId });
    queryBuilder.leftJoinAndSelect('report.productCategory', 'productCategory');
    const data = queryBuilder
      .getManyAndCount();
    return data;
  }

  @Cron('0 30 23 * * *')
  async createReportInbound() {
    
    var today = parseDate(new Date());
    var month = today.getMonth() + 1;
    var year = today.getFullYear();
    const res = new ResponseDTO();
    const warehouseFilter = new FilterWarehouseDTO();
    warehouseFilter.sortBy = "id";
    warehouseFilter.sortDirection = "desc";
    const warehouse = await this.warehouseService.findAll(warehouseFilter);
    for (let index = 0; index < warehouse.data.length; index++) {
      const element = warehouse.data[index];
      const data = this.getReportInbound(month, year, warehouse.data[index].id);
      await data?.then(rs => {
        res.totalItem = rs[1];
        res.data = rs[0];
      });
      const typeNameGet = [];
      const typeName = [];
      for (const element of res?.data) {
        typeName.push(element.typeName);
      }
      
      const temp = await this.productService.getReportInboundProduct(month, year, element.id);
      for (const element of temp) {
        typeNameGet.push(String(element?.value2));
      }
      let difference = typeNameGet?.filter(x => !typeName.includes(x));
      if (typeName.length >= 1 && typeName.length < 3)
        for (let index4 = 0; index4 < difference.length; index4++) {
          for (let index1 = 0; index1 < temp.length; index1++) {
            const tmp = difference[index4];
            if (tmp === String(temp[index1]?.value2)) {
              let dto1 = new ReportDTO();
              dto1.valueProduct = Number(temp[index1]?.value);
              dto1.typeName = String(temp[index1]?.value2);
              dto1.reportType = ReportType.INBOUND;
              dto1.warehouseId = element.id;
              dto1.month = month;
              dto1.year = year;
              this.create(dto1);
            }
          }
        }
      if (res?.data[0]?.id) {
        
        for (let index = 0; index < res.data.length; index++) {
          const elementReport = res.data[index];
          for (let index = 0; index < temp.length; index++) {
            const elmentGet = temp[index];
            if (String(elmentGet?.value2) == elementReport.typeName) {
              
              let dto = new ReportDTO();
              dto.valueProduct = Number(elmentGet?.value);
              dto.typeName = String(elmentGet?.value2);
              dto.reportType = ReportType.INBOUND;
              dto.id = elementReport.id;
              this.update(dto.id, dto);
            }
          }
        }
      }
      else if (!res?.data[0]?.id) {
        
        for (let index = 0; index < temp.length; index++) {
          const elmentGet = temp[index];
          let dto = new ReportDTO();
         
          dto.valueProduct = Number(elmentGet?.value);
          dto.typeName = String(elmentGet?.value2);
          dto.reportType = ReportType.INBOUND;
          dto.warehouseId = element.id;
          dto.month = month;
          dto.year = year;
          this.create(dto);
        }
      }
    }


  }

}


