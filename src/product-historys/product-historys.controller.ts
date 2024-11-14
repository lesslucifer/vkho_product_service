import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProductHistorysService } from './product-historys.service';
import { CreateProductHistoryDto } from './dto/create-product-history.dto';
import { UpdateProductHistoryDto } from './dto/update-product-history.dto';
import { PRODUCT_PATTERN } from 'src/constants/product.constants';
import { PRODUCT_HISTORY_PATTERN } from 'src/constants/product-history.constants';

@Controller()
export class ProductHistorysController {
  constructor(private readonly productHistorysService: ProductHistorysService) {}

  @MessagePattern(PRODUCT_HISTORY_PATTERN.PRODUCT_HISTORY_CREATE)
  create(@Payload() createProductHistoryDto: CreateProductHistoryDto) {
    return this.productHistorysService.create(createProductHistoryDto);
  }

  @MessagePattern(PRODUCT_HISTORY_PATTERN.PRODUCT_HISTORY_GET_ALL)
  findAll() {
    return this.productHistorysService.findAll();
  }

  @MessagePattern(PRODUCT_HISTORY_PATTERN.PRODUCT_HISTORY_GET_ONE)
  findOne(@Payload() id: number) {
    return this.productHistorysService.findOne(id);
  }

  @MessagePattern(PRODUCT_HISTORY_PATTERN.PRODUCT_HISTORY_UPDATE)
  update(@Payload() updateProductHistoryDto: UpdateProductHistoryDto) {
    return this.productHistorysService.update(updateProductHistoryDto.id, updateProductHistoryDto);
  }

  @MessagePattern(PRODUCT_HISTORY_PATTERN.PRODUCT_HISTORY_DELETE)
  remove(@Payload() id: number) {
    return this.productHistorysService.remove(id);
  }
}
