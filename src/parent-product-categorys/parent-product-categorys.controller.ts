import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ParentProductCategorysService } from './parent-product-categorys.service';
import { CreateParentProductCategoryDto } from './dto/create-parent-product-category.dto';
import { ParentProductCategory } from './entities/parent-product-category.entity';
import { PARENT_PRODUCT_CATEGORY_PATTERN } from 'src/constants/parent-product-category.constants';
import { UpdateProductDto } from 'src/product/dto/update-product.dto';
import { UpdateParentProductCategoryDto } from './dto/update-parent-product-category.dto';
import { ParentProductCategoryFilter } from './dto/filter-parent-product-category.dto';
import { ResponseDTO } from 'src/common/response.dto';
import { BufferedFile } from 'src/common/buffered-file.dto';

@Controller()
export class ParentProductCategorysController {
  constructor(private readonly parentProductCategorysService: ParentProductCategorysService) {}

  @MessagePattern(PARENT_PRODUCT_CATEGORY_PATTERN.PARENT_PRODUCT_CATEGORY_CREATE)
  create(@Payload() createParentProductCategoryDto: CreateParentProductCategoryDto): Promise<ParentProductCategory> {
    return this.parentProductCategorysService.create(createParentProductCategoryDto);
  }

  @MessagePattern(PARENT_PRODUCT_CATEGORY_PATTERN.PARENT_PRODUCT_CATEGORY_CREATE_EXCEL)
  createExcel(@Payload() data: BufferedFile) {
    return this.parentProductCategorysService.createExcel(data);
  }

  @MessagePattern(PARENT_PRODUCT_CATEGORY_PATTERN.PARENT_PRODUCT_CATEGORY_GET_ALL)
  async findAll(@Payload() productCategoryFilter: ParentProductCategoryFilter): Promise<ResponseDTO> {
    productCategoryFilter.page = Number(productCategoryFilter?.page)
    productCategoryFilter.limit = Number(productCategoryFilter?.limit)

    const parentProductCategorys: ResponseDTO = await this.parentProductCategorysService.findAll({
      ...productCategoryFilter
    });
    return parentProductCategorys;
  }

  @MessagePattern(PARENT_PRODUCT_CATEGORY_PATTERN.PARENT_PRODUCT_CATEGORY_GET_ONE)
  findOne(@Payload() id: number): Promise<ParentProductCategory> {
    return this.parentProductCategorysService.findOne(id);
  }

  @MessagePattern(PARENT_PRODUCT_CATEGORY_PATTERN.PARENT_PRODUCT_CATEGORY_UPDATE)
  update(@Payload() currentProductCategory: UpdateParentProductCategoryDto): Promise<ParentProductCategory> {
    return this.parentProductCategorysService.update(currentProductCategory.id, currentProductCategory);
  }

  @MessagePattern(PARENT_PRODUCT_CATEGORY_PATTERN.PARENT_PRODUCT_CATEGORY_DELETE)
  remove(@Payload() id: number) {
    return this.parentProductCategorysService.remove(id);
  }
}
