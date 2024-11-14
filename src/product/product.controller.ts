import { Controller } from '@nestjs/common';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { Product } from './entities/product.entity';
import { PRODUCT_PATTERN } from 'src/constants/product.constants';
import { ProductFilter } from './dto/filter-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { RackProductDTO } from './dto/rack-product.dto';
import { IdsDTO } from 'src/common/list-id.dto';
import { UpdateLocationProduct } from './dto/update-location-product.dto';
import { ScanProduct } from './dto/scan-product.dto';
import { SplitProduct } from './dto/split-product.dto';
import { UpdateProducts } from './dto/update-products.dto';
import { ProductScanResponse } from './dto/response-product.dto';
import { ResponseDTO } from 'src/common/response.dto';
import { RecommendProduct } from './dto/recommend-product.dto';
import { BufferedFile } from 'src/common/buffered-file.dto';

@Controller()
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @MessagePattern(PRODUCT_PATTERN.PRODUCT_CREATE)
  create(@Payload() createProductDto: CreateProductDto): Promise<Product> {
    return this.productService.create(createProductDto);
  }

  @MessagePattern(PRODUCT_PATTERN.PRODUCT_CANCEL_REALLOCATING)
  cancelReallocating(@Payload() productDtos: UpdateProductDto[]): Promise<Product[]> {
    return this.productService.cancelReallocating(productDtos);
  }

  @MessagePattern(PRODUCT_PATTERN.PRODUCT_ADD_RACK)
  addRack(@Payload() rackProductDTO: RackProductDTO): Promise<Product[]> {
    return this.productService.addRack(rackProductDTO);
  }
  

  @MessagePattern(PRODUCT_PATTERN.PRODUCT_UPDATE_LOCATION)
  updateLocation(@Payload() updateLocationProduct: UpdateLocationProduct): Promise<Product[]> {
    return this.productService.updateLocation(updateLocationProduct);
  }

  @MessagePattern(PRODUCT_PATTERN.PRODUCT_SCAN)
  async scan(@Payload() scanProduct: ScanProduct): Promise<ProductScanResponse> {
    scanProduct.page = Number(scanProduct?.page)
    scanProduct.limit = Number(scanProduct?.limit)
    
    const products: ProductScanResponse = await this.productService.scan({
      ...scanProduct
    });
    return products;
  }

  @MessagePattern(PRODUCT_PATTERN.PRODUCT_SPLIT)
  async splitProduct(@Payload() splitProduct: SplitProduct): Promise<Product> {
    return this.productService.splitProduct(splitProduct);
  }

  @MessagePattern(PRODUCT_PATTERN.PRODUCT_GET_ALL)
  async findAll(@Payload() productFilter: ProductFilter): Promise<ResponseDTO> {
    productFilter.page = Number(productFilter?.page)
    productFilter.limit = Number(productFilter?.limit)
    
    const products = await this.productService.findAll({
      ...productFilter
    });
    return products;
  }

  @MessagePattern(PRODUCT_PATTERN.PRODUCT_GET_INVENTORY)
  async getInventory(@Payload() productFilter: ProductFilter) {
    return await this.productService.getInventory(productFilter);
  }

  @MessagePattern(PRODUCT_PATTERN.PRODUCT_RECOMMEND)
  async findListProductByMasterProductId (@Payload() recommendProduct: RecommendProduct): Promise<ResponseDTO> {
    recommendProduct.page = Number(recommendProduct?.page)
    recommendProduct.limit = Number(recommendProduct?.limit)
    const products = await this.productService.findListProductByMasterProductId({
      ...recommendProduct
    });
    return products;
  }

  @MessagePattern(PRODUCT_PATTERN.PRODUCT_GET_ONE)
  findOne(@Payload() id: number): Promise<Product> {
    return this.productService.findOne(id);
  }

  @MessagePattern(PRODUCT_PATTERN.PRODUCT_UPDATE)
  update(@Payload() currentProduct: UpdateProductDto): Promise<Product> {
    const id = currentProduct.id;
    return this.productService.update(id, currentProduct);
  }

  @MessagePattern(PRODUCT_PATTERN.PRODUCT_DELETE)
  remove(id: number) {
    return this.productService.remove(id);
  }

  @MessagePattern(PRODUCT_PATTERN.PRODUCT_DELETES)
  removes(@Payload() idsDTO: IdsDTO) {
    return this.productService.removes(idsDTO);
  }

  @MessagePattern(PRODUCT_PATTERN.PRODUCT_UPDATES)
  updates(@Payload() updateProducts: UpdateProducts) {
    return this.productService.updates(updateProducts);
  }

  @MessagePattern(PRODUCT_PATTERN.PRODUCT_CREATE_EXCEL)
  createExcel(@Payload() data: BufferedFile) {
    return this.productService.createExcel(data);
  }
}
