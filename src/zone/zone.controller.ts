import { Controller } from '@nestjs/common';
import { ZoneService } from './zone.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { Zone } from './entities/zone.entity';
import { ZONE_PATTERN } from 'src/constants/zone.constants';
import { ZoneFilter } from './dto/filter-zone.dto';
import { ResponseDTO } from 'src/common/response.dto';

@Controller()
export class ZoneController {
  constructor(private readonly zoneService: ZoneService) {}

  @MessagePattern(ZONE_PATTERN.ZONE_CREATE)
  create(@Payload() createZoneDto: CreateZoneDto): Promise<Zone> {
    return this.zoneService.create(createZoneDto);
  }

  @MessagePattern(ZONE_PATTERN.ZONE_GET_ALL)
  async findAll(@Payload() zoneFilter: ZoneFilter): Promise<ResponseDTO> {

    zoneFilter.page = Number(zoneFilter?.page)
    zoneFilter.limit = Number(zoneFilter?.limit)

    const zones: ResponseDTO = await this.zoneService.findAll({
      ...zoneFilter
    });
    return zones;
  }

  @MessagePattern(ZONE_PATTERN.ZONE_GET_ONE)
  findOne(@Payload() id: number): Promise<Zone> {
    return this.zoneService.findOne(id);
  }

  @MessagePattern(ZONE_PATTERN.ZONE_UPDATE)
  update(@Payload() updateZone: Zone): Promise<Zone> {
    const id = updateZone.id;
    return this.zoneService.update(id, updateZone);
  }

  @MessagePattern(ZONE_PATTERN.ZONE_DELETE)
  remove(@Payload() id: number) {
    return this.zoneService.remove(id);
  }
}
