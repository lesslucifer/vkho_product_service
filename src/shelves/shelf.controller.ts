import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ShelfService } from './shelf.service';
import { CreateShelfDto } from './dto/create-shelf.dto';
import { UpdateShelfDto } from './dto/update-shelf.dto';
import { SHELVES_PATTERN } from 'src/constants/shelves.constants';
import { ShelfFilter } from './dto/filter-shelf.dto';
import { Shelf } from './entities/shelf.entity';
import { ResponseDTO } from 'src/common/response.dto';
import { BufferedFile } from 'src/common/buffered-file.dto';

@Controller()
export class ShelfController {
  constructor(private readonly shelfService: ShelfService) {}

  @MessagePattern(SHELVES_PATTERN.SHELVES_CREATE)
  create(@Payload() createShelfDto: CreateShelfDto) {
    return this.shelfService.create(createShelfDto);
  }

  @MessagePattern(SHELVES_PATTERN.SHELVES_CREATE_EXCEL)
  createExcel(@Payload() data: BufferedFile) {
    return this.shelfService.createExcel(data);
  }

  @MessagePattern(SHELVES_PATTERN.SHELVES_GET_ALL)
  async findAll(@Payload() shelfFilter: ShelfFilter): Promise<ResponseDTO> {
    shelfFilter.page = Number(shelfFilter?.page)
    shelfFilter.limit = Number(shelfFilter?.limit)

    const shelf: ResponseDTO = await this.shelfService.findAll({
      ...shelfFilter
    });
    return shelf;
  }

  @MessagePattern(SHELVES_PATTERN.SHELVES_GET_ONE)
  findOne(@Payload() id: number) {
    return this.shelfService.findOne(id);
  }

  @MessagePattern(SHELVES_PATTERN.SHELVES_UPDATE)
  update(@Payload() updateShelfDto: UpdateShelfDto) {
    return this.shelfService.update(updateShelfDto.id, updateShelfDto);
  }

  @MessagePattern(SHELVES_PATTERN.SHELVES_DELETE)
  remove(@Payload() id: number) {
    return this.shelfService.remove(id);
  }
}
