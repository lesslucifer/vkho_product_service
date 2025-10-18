import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { WarehouseGroupService } from './warehouse-group.service';
import { CreateWarehouseGroupDto } from './dto/create-warehouse-group.dto';
import { UpdateWarehouseGroupDto } from './dto/update-warehouse-group.dto';
import { WAREHOUSE_GROUP_PATTERN } from 'src/constants/warehouse-group.constants';
import { FilterWarehouseGroupDTO } from './dto/filter-warehouse-group.dto';
import { IdsDTO } from 'src/common/list-id.dto';
import { ResponseDTO } from 'src/common/response.dto';

@Controller()
export class WarehouseGroupController {
  constructor(private readonly warehouseGroupService: WarehouseGroupService) {}

  @MessagePattern(WAREHOUSE_GROUP_PATTERN.WAREHOUSE_GROUP_CREATE)
  create(@Payload() createWarehouseGroupDto: CreateWarehouseGroupDto) {
    return this.warehouseGroupService.create(createWarehouseGroupDto);
  }

  @MessagePattern(WAREHOUSE_GROUP_PATTERN.WAREHOUSE_GROUP_GET_ALL)
  async findAll(@Payload() filterWarehouseGroupDTO: FilterWarehouseGroupDTO): Promise<ResponseDTO> {
    filterWarehouseGroupDTO.page = Number(filterWarehouseGroupDTO?.page)
    filterWarehouseGroupDTO.limit = Number(filterWarehouseGroupDTO?.limit)

    const warehouseGroups = await this.warehouseGroupService.findAll({
      ...filterWarehouseGroupDTO
    });
    return warehouseGroups;
  }

  @MessagePattern(WAREHOUSE_GROUP_PATTERN.WAREHOUSE_GROUP_GET_ONE)
  findOne(@Payload() id: number) {
    return this.warehouseGroupService.findOne(id);
  }

  @MessagePattern(WAREHOUSE_GROUP_PATTERN.WAREHOUSE_GROUP_GET_BY_USER)
  findByUserId(@Payload() userId: string): Promise<ResponseDTO> {
    return this.warehouseGroupService.findByUserId(userId);
  }

  @MessagePattern(WAREHOUSE_GROUP_PATTERN.WAREHOUSE_GROUP_UPDATE)
  update(@Payload() updateWarehouseGroupDto: UpdateWarehouseGroupDto) {
    return this.warehouseGroupService.update(updateWarehouseGroupDto.id, updateWarehouseGroupDto);
  }

  @MessagePattern(WAREHOUSE_GROUP_PATTERN.WAREHOUSE_GROUP_DELETE)
  remove(@Payload() id: number) {
    return this.warehouseGroupService.remove(id);
  }

  @MessagePattern(WAREHOUSE_GROUP_PATTERN.WAREHOUSE_GROUP_DELETES)
  removes(@Payload() idsDTO: IdsDTO) {
    return this.warehouseGroupService.removes(idsDTO);
  }
}
