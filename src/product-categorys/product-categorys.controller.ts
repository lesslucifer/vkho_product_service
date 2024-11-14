import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ProductCategorysService } from './product-categorys.service';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { ProductCategory } from './entities/product-category.entity';
import { PRODUCT_CATEGORY_PATTERN } from 'src/constants/product-category.constants';
import { UpdateProductDto } from 'src/product/dto/update-product.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { ProductCategoryFilter } from './dto/filter-product-category.dto';
import { ResponseDTO } from 'src/common/response.dto';
import { BufferedFile } from 'src/common/buffered-file.dto';

@Controller()
export class ProductCategorysController {
  constructor(private readonly productCategorysService: ProductCategorysService) {}

  @MessagePattern(PRODUCT_CATEGORY_PATTERN.PRODUCT_CATEGORY_CREATE)
  create(@Payload() createProductCategoryDto: CreateProductCategoryDto): Promise<ProductCategory> {
    return this.productCategorysService.create(createProductCategoryDto);
  }

  @MessagePattern(PRODUCT_CATEGORY_PATTERN.PRODUCT_CATEGORY_CREATE_EXCEL)
  createExcel(@Payload() data: BufferedFile) {
    return this.productCategorysService.createExcel(data);
  }

  @MessagePattern(PRODUCT_CATEGORY_PATTERN.PRODUCT_CATEGORY_GET_ALL)
  async findAll(@Payload() productCategoryFilter: ProductCategoryFilter): Promise<ResponseDTO> {
    productCategoryFilter.page = Number(productCategoryFilter?.page)
    productCategoryFilter.limit = Number(productCategoryFilter?.limit)

    const productCategorys: ResponseDTO = await this.productCategorysService.findAll({
      ...productCategoryFilter
    });
    return productCategorys;
  }

  @MessagePattern(PRODUCT_CATEGORY_PATTERN.PRODUCT_CATEGORY_GET_ONE)
  findOne(@Payload() id: number): Promise<ProductCategory> {
    return this.productCategorysService.findOne(id);
  }

  @MessagePattern(PRODUCT_CATEGORY_PATTERN.PRODUCT_CATEGORY_UPDATE)
  update(@Payload() currentProductCategory: UpdateProductCategoryDto): Promise<ProductCategory> {
    return this.productCategorysService.update(currentProductCategory.id, currentProductCategory);
  }

  @MessagePattern(PRODUCT_CATEGORY_PATTERN.PRODUCT_CATEGORY_DELETE)
  remove(@Payload() id: number) {
    return this.productCategorysService.remove(id);
  }
}
