import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { BomService } from './bom.service';
import { CreateBomDto } from './dto/create-bom.dto';
import { UpdateBomDto } from './dto/update-bom.dto';
import { BOM_PATTERN } from 'src/constants/bom.constant';
import { BomFilter } from './dto/filter-bom.dto';
import { Bom } from './entities/bom.entity';
import { ResponseDTO } from 'src/common/response.dto';
import { BufferedFile } from 'src/common/buffered-file.dto';
import { BomDetailDto } from './dto/bom-detail.dto';

@Controller()
export class BomController {
  constructor(private readonly bomService: BomService) {}

  @MessagePattern(BOM_PATTERN.BOM_CREATE)
  create(@Payload() CreateBomDto: CreateBomDto) {
    console.log(CreateBomDto);
    return this.bomService.create(CreateBomDto);
  }

  @MessagePattern(BOM_PATTERN.BOM_UPDATE)
  update(@Payload() updateBomDto: UpdateBomDto) {
    return this.bomService.update(updateBomDto);
  }

  @MessagePattern(BOM_PATTERN.BOM_DELETE)
  remove(@Payload() id: number) {
    return this.bomService.remove(id);
  }

  @MessagePattern(BOM_PATTERN.BOM_GET_BY_MASTER)
  getByMasterProductId(@Payload() masterProductId: number): Promise<BomDetailDto> {
    return this.bomService.getByMasterProductId(masterProductId);
  }

  @MessagePattern(BOM_PATTERN.BOM_GET_ONE)
  getOne(@Payload() id: number): Promise<BomDetailDto> {
    return this.bomService.getOne(id);
  }
}
