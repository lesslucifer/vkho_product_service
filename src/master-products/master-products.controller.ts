import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { MasterProductsService } from './master-products.service';
import { CreateMasterProductDto } from './dto/create-master-product.dto';
import { UpdateMasterProductDto } from './dto/update-master-product.dto';
import { MASTER_PRODUCT_PATTERN } from 'src/constants/master-product.constants';
import { MasterProductFilter } from './dto/filter-master-product.dto';
import { MasterProduct } from './entities/master-product.entity';
import { ResponseDTO } from 'src/common/response.dto';
import { BufferedFile } from 'src/common/buffered-file.dto';

@Controller()
export class MasterProductsController {
  constructor(private readonly masterProductsService: MasterProductsService) {}

  @MessagePattern(MASTER_PRODUCT_PATTERN.MASTER_PRODUCT_CREATE)
  create(@Payload() createMasterProductDto: CreateMasterProductDto) {
    return this.masterProductsService.create(createMasterProductDto);
  }

  @MessagePattern(MASTER_PRODUCT_PATTERN.MASTER_PRODUCT_CREATE_EXCEL)
  createExcel(@Payload() data: BufferedFile) {
    return this.masterProductsService.createExcel(data);
  }


  @MessagePattern(MASTER_PRODUCT_PATTERN.MASTER_PRODUCT_GET_ALL)
  async findAll(@Payload() masterProductFilter: MasterProductFilter): Promise<ResponseDTO> {
    masterProductFilter.page = Number(masterProductFilter?.page)
    masterProductFilter.limit = Number(masterProductFilter?.limit)

    const master: ResponseDTO = await this.masterProductsService.findAll({
      ...masterProductFilter
    });
    return master;
  }

  @MessagePattern(MASTER_PRODUCT_PATTERN.MASTER_PRODUCT_GET_ONE)
  findOne(@Payload() id: number) {
    return this.masterProductsService.findOne(id);
  }

  @MessagePattern(MASTER_PRODUCT_PATTERN.MASTER_PRODUCT_UPDATE)
  update(@Payload() updateMasterProductDto: UpdateMasterProductDto) {
    return this.masterProductsService.update(updateMasterProductDto.id, updateMasterProductDto);
  }

  @MessagePattern(MASTER_PRODUCT_PATTERN.MASTER_PRODUCT_DELETE)
  remove(@Payload() id: number) {
    return this.masterProductsService.remove(id);
  }

  @MessagePattern(MASTER_PRODUCT_PATTERN.MASTER_PRODUCT_GET_AVAILABLE_QUANTITY)
  getAvailableQuantity(@Payload() masterProductId: number): Promise<{ availableQuantity: number }> {
    return this.masterProductsService.getAvailableQuantity(masterProductId);
  }

  @MessagePattern(MASTER_PRODUCT_PATTERN.MASTER_PRODUCT_RECALCULATE_QUANTITY)
  recalculateAvailableQuantity(@Payload() masterProductId: number): Promise<{ availableQuantity: number }> {
    return this.masterProductsService.recalculateAvailableQuantity(masterProductId);
  }

  @MessagePattern(MASTER_PRODUCT_PATTERN.MASTER_PRODUCT_GET_AVAILABLE_BY_BARCODE)
  getAvailableQuantityByBarcode(@Payload() data: { barCode: string; warehouseId: number }): Promise<{ availableQuantity: number }> {
    return this.masterProductsService.getAvailableQuantityByBarcode(data.barCode, data.warehouseId);
  }

  @MessagePattern(MASTER_PRODUCT_PATTERN.MASTER_PRODUCT_BULK_UPDATE_QUANTITIES)
  bulkUpdateAvailableQuantities(@Payload() warehouseId: number): Promise<void> {
    return this.masterProductsService.bulkUpdateAvailableQuantities(warehouseId);
  }

  @MessagePattern(MASTER_PRODUCT_PATTERN.MASTER_PRODUCT_GET_ALL_WITH_QUANTITY)
  getAllWithAvailableQuantity(@Payload() warehouseId: number): Promise<any[]> {
    return this.masterProductsService.getAllWithAvailableQuantity(warehouseId);
  }

  @MessagePattern(MASTER_PRODUCT_PATTERN.MASTER_PRODUCT_GET_BY_WAREHOUSE)
  getAvailableQuantityByWarehouse(@Payload() data: { warehouseId: number; page?: number; limit?: number }): Promise<ResponseDTO> {
    const page = data.page || 1;
    const limit = data.limit || 10;
    return this.masterProductsService.getAvailableQuantityByWarehouse(data.warehouseId, page, limit);
  }
}
