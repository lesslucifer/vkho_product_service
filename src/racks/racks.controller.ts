import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RacksService } from './racks.service';
import { CreateRackDto } from './dto/create-rack.dto';
import { RACK_PATTERN } from 'src/constants/rack.constants';
import { Rack } from './entities/rack.entity';
import { RecommendDTO } from './dto/recommend-rack.dto';
import { RackFilter } from './dto/filter-rack.dto';
import { ResponseDTO } from 'src/common/response.dto';

@Controller()
export class RacksController {
  constructor(private readonly racksService: RacksService) { }

  @MessagePattern(RACK_PATTERN.RACK_CREATE)
  create(@Payload() createRackDto: CreateRackDto): Promise<Rack> {
    return this.racksService.create(createRackDto);
  }

  @MessagePattern(RACK_PATTERN.RACK_GET_ALL)
  async findAll(@Payload() rackFilter: RackFilter): Promise<ResponseDTO> {
    rackFilter.page = Number(rackFilter?.page)
    rackFilter.limit = Number(rackFilter?.limit)

    const racks: ResponseDTO = await this.racksService.findAll({
      ...rackFilter
    });
    return racks;
  }

  @MessagePattern(RACK_PATTERN.RACK_RECOMMEND)
  async recommendRack(@Payload() recommendDTO: RecommendDTO): Promise<Rack> {
    const racks: Rack = await this.racksService.recommendRack(recommendDTO);
    return racks;
  }

  @MessagePattern(RACK_PATTERN.RACK_GET_ONE)
  findOne(@Payload() id: number): Promise<Rack> {
    return this.racksService.findOne(id);
  }

  @MessagePattern(RACK_PATTERN.RACK_UPDATE)
  update(@Payload() currentRack: Rack): Promise<Rack> {
    return this.racksService.update(currentRack.id, currentRack);
  }

  @MessagePattern(RACK_PATTERN.RACK_DELETE)
  remove(@Payload() id: number) {
    return this.racksService.remove(id);
  }
}
