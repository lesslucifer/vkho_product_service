import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { SUPPLIER_PATTERN } from 'src/constants/supplier.constants';
import { Supplier } from './entities/supplier.entity';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierFilter } from './dto/filter-supplier.dto';
import { ResponseDTO } from 'src/common/response.dto';
import { BufferedFile } from 'src/common/buffered-file.dto';

@Controller()
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @MessagePattern(SUPPLIER_PATTERN.SUPPLIER_CREATE)
  create(@Payload() createSupplierDto: CreateSupplierDto): Promise<Supplier> {
    return this.suppliersService.create(createSupplierDto);
  }

  @MessagePattern(SUPPLIER_PATTERN.SUPPLIER_GET_ALL)
  async findAll(@Payload() supplierFilter: SupplierFilter): Promise<ResponseDTO> {

    supplierFilter.page = Number(supplierFilter?.page)
    supplierFilter.limit = Number(supplierFilter?.limit)

    const suppliers: ResponseDTO = await this.suppliersService.findAll({
      ...supplierFilter
    });
    return suppliers;
  }

  @MessagePattern(SUPPLIER_PATTERN.SUPPLIER_GET_ONE)
  findOne(@Payload() id: number): Promise<Supplier> {
    return this.suppliersService.findOne(id);
  }

  @MessagePattern(SUPPLIER_PATTERN.SUPPLIER_UPDATE)
  update(@Payload() currentSupplier: UpdateSupplierDto): Promise<Supplier> {
    return this.suppliersService.update(currentSupplier.id, currentSupplier);
  }

  @MessagePattern(SUPPLIER_PATTERN.SUPPLIER_DELETE)
  remove(@Payload() id: number) {
    return this.suppliersService.remove(id);
  }

  @MessagePattern(SUPPLIER_PATTERN.SUPPLIER_CREATE_EXCEL)
  createExcel(@Payload() data: BufferedFile) {
    return this.suppliersService.createExcel(data);
  }
}
