import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { VanService } from './van.service';
import { CreateVanDto } from './dto/create-van.dto';
import { UpdateVanDto } from './dto/update-van.dto';
import { VanFilter } from './dto/filter-van.dto';
import { Van } from './entities/van.entity';
import { ResponseDTO } from 'src/common/response.dto';
import { VAN_PATTERN } from 'src/constants/van.constants';

@Controller()
export class VanController {
  constructor(private readonly vanService: VanService) {}

  @MessagePattern(VAN_PATTERN.VAN_CREATE)
  create(@Payload() createShelfDto: CreateVanDto) {
    return this.vanService.create(createShelfDto);
  }

  @MessagePattern(VAN_PATTERN.VAN_GET_ALL)
  async findAll(@Payload() shelfFilter: VanFilter): Promise<ResponseDTO> {
    shelfFilter.page = Number(shelfFilter?.page)
    shelfFilter.limit = Number(shelfFilter?.limit)

    const shelf: ResponseDTO = await this.vanService.findAll({
      ...shelfFilter
    });
    return shelf;
  }

  @MessagePattern(VAN_PATTERN.VAN_GET_ONE)
  findOne(@Payload() id: number) {
    return this.vanService.findOne(id);
  }

  @MessagePattern(VAN_PATTERN.VAN_UPDATE)
  update(@Payload() updateShelfDto: UpdateVanDto) {
    return this.vanService.update(updateShelfDto.id, updateShelfDto);
  }

  @MessagePattern(VAN_PATTERN.VAN_DELETE)
  remove(@Payload() id: number) {
    return this.vanService.remove(id);
  }
}
