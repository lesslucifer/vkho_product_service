import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { WarehouseService } from './warehouse.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { WAREHOUSE_PATTERN } from 'src/constants/warehouse.constants';
import { FilterWarehouseDTO } from './dto/filter-warehouse.dto';
import { IdsDTO } from 'src/common/list-id.dto';
import { ResponseDTO } from 'src/common/response.dto';
import { AddUserToWarehouse } from './dto/add-user-warehouse.dto';

@Controller()
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @MessagePattern(WAREHOUSE_PATTERN.WAREHOUSE_CREATE)
  create(@Payload() createWarehouseDto: CreateWarehouseDto) {
    return this.warehouseService.create(createWarehouseDto);
  }

  @MessagePattern(WAREHOUSE_PATTERN.WAREHOUSE_GET_ALL)
  async findAll(@Payload() filterWarehouseDTO: FilterWarehouseDTO): Promise<ResponseDTO> {
    filterWarehouseDTO.page = Number(filterWarehouseDTO?.page)
    filterWarehouseDTO.limit = Number(filterWarehouseDTO?.limit)

    const receipts = await this.warehouseService.findAll({
      ...filterWarehouseDTO
    });
    return receipts;
  }

  @MessagePattern(WAREHOUSE_PATTERN.WAREHOUSE_GET_ONE)
  findOne(@Payload() id: number) {
    return this.warehouseService.findOne(id);
  }

  @MessagePattern(WAREHOUSE_PATTERN.WAREHOUSE_UPDATE)
  update(@Payload() updateWarehouseDto: UpdateWarehouseDto) {
    return this.warehouseService.update(updateWarehouseDto.id, updateWarehouseDto);
  }

  @MessagePattern(WAREHOUSE_PATTERN.WAREHOUSE_DELETE)
  remove(@Payload() id: number) {
    return this.warehouseService.remove(id);
  }

  @MessagePattern(WAREHOUSE_PATTERN.WAREHOUSE_DELETES)
  removes(@Payload() idsDTO: IdsDTO) {
    return this.warehouseService.removes(idsDTO);
  }

  @MessagePattern(WAREHOUSE_PATTERN.WAREHOUSE_ADD_USER)
  addUser(@Payload() add: AddUserToWarehouse) {
    return this.warehouseService.addUser(add);
  }

  @MessagePattern(WAREHOUSE_PATTERN.WAREHOUSE_UPDATE_USER)
  updateUser(@Payload() add: AddUserToWarehouse) {
    return this.warehouseService.updateUser(add);
  }
}
