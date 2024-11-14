import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { UpdateProductDto } from 'src/product/dto/update-product.dto';

import { ResponseDTO } from 'src/common/response.dto';
import { Divison } from './entities/divison.entity';
import { CreateDivisonDto } from './dto/create-divison.dto';
import { DivisonFilter } from './dto/filter-divison.dto';
import { DivisonService } from './divison.service';
import { DIVISON_PATTERN } from 'src/constants/divison.constants';
import { BufferedFile } from 'src/common/buffered-file.dto';

@Controller()
export class DivisonController {
  constructor(private readonly DivisonsService: DivisonService) {}

  @MessagePattern(DIVISON_PATTERN.DIVISON_CREATE)
  create(@Payload() createDivisonDto: CreateDivisonDto): Promise<Divison> {
    return this.DivisonsService.create(createDivisonDto);
  }

  @MessagePattern(DIVISON_PATTERN.DIVISON_CREATE_EXCEL)
  createExcel(@Payload() data: BufferedFile) {
    return this.DivisonsService.createExcel(data);
  }

  @MessagePattern(DIVISON_PATTERN.DIVISON_GET_ALL)
  async findAll(@Payload() productCategoryFilter: DivisonFilter): Promise<ResponseDTO> {
    productCategoryFilter.page = Number(productCategoryFilter?.page)
    productCategoryFilter.limit = Number(productCategoryFilter?.limit)

    const Divisons: ResponseDTO = await this.DivisonsService.findAll({
      ...productCategoryFilter
    });
    return Divisons;
  }

  @MessagePattern(DIVISON_PATTERN.DIVISON_GET_ONE)
  findOne(@Payload() id: number): Promise<Divison> {
    return this.DivisonsService.findOne(id);
  }

  @MessagePattern(DIVISON_PATTERN.DIVISON_UPDATE)
  update(@Payload() currentProductCategory: Divison): Promise<Divison> {
    return this.DivisonsService.update(currentProductCategory.id, currentProductCategory);
  }

  @MessagePattern(DIVISON_PATTERN.DIVISON_DELETE)
  remove(@Payload() id: number) {
    return this.DivisonsService.remove(id);
  }
}
