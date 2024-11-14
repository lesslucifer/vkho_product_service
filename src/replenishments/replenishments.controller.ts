import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ReplenishmentsService } from './replenishments.service';
import { CreateReplenishmentDto } from './dto/create-replenishment.dto';
import { UpdateReplenishmentDto } from './dto/update-replenishment.dto';
import { REPLENISHMENTS_PATTERN } from 'src/constants/replenishments.constants';
import { ReplenishmentFilter } from './dto/filter-replenishment.dto';
import { ReplenishmentDTO } from './dto/response-replenishment.dto';
import { ProductService } from 'src/product/product.service';
import { ResponseDTO } from 'src/common/response.dto';

@Controller()
export class ReplenishmentsController {
  constructor(private readonly replenishmentsService: ReplenishmentsService) { }

  @MessagePattern(REPLENISHMENTS_PATTERN.REPLENISHMENTS_CREATE)
  create(@Payload() createReplenishmentDto: CreateReplenishmentDto) {
    return this.replenishmentsService.create(createReplenishmentDto);
  }

  @MessagePattern(REPLENISHMENTS_PATTERN.REPLENISHMENTS_GET_ALL)
  async findAll(@Payload() replenishmentFilter: ReplenishmentFilter): Promise<ResponseDTO> {

    replenishmentFilter.page = Number(replenishmentFilter?.page)
    replenishmentFilter.limit = Number(replenishmentFilter?.limit)

    return this.replenishmentsService.findAll({
      ...replenishmentFilter
    });
  }

  @MessagePattern(REPLENISHMENTS_PATTERN.REPLENISHMENTS_GET_ONE)
  findOne(@Payload() id: number) {
    return this.replenishmentsService.findOne(id);
  }

  @MessagePattern(REPLENISHMENTS_PATTERN.REPLENISHMENTS_UPDATE)
  update(@Payload() updateReplenishmentDto: UpdateReplenishmentDto) {
    return this.replenishmentsService.update(updateReplenishmentDto.id, updateReplenishmentDto);
  }

  @MessagePattern(REPLENISHMENTS_PATTERN.REPLENISHMENTS_DELETE)
  remove(@Payload() id: number) {
    return this.replenishmentsService.remove(id);
  }
}
