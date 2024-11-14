import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProductHistoryDto } from './dto/create-product-history.dto';
import { UpdateProductHistoryDto } from './dto/update-product-history.dto';
import { ProductHistory } from './entities/product-history.entity';

@Injectable()
export class ProductHistorysService {

  private readonly logger = new Logger(ProductHistorysService.name);

  constructor(
    @InjectRepository(ProductHistory)
    private productHistoryRepository: Repository<ProductHistory>,
  ) {}

  async create(createProductHistoryDto: CreateProductHistoryDto) {
    this.logger.log(`Request to save Product History: ${createProductHistoryDto.name}`);
    const newProductHistory = await this.productHistoryRepository.create(createProductHistoryDto);
    await this.productHistoryRepository.save(newProductHistory);
    return newProductHistory;
  }

  findAll(): Promise<Array<ProductHistory>> {
    this.logger.log(`Request to get all Product History`);
    return this.productHistoryRepository.find();
  }

  async findOne(id: number) {
    this.logger.log(`Request to get Product History: ${id}`);
    const ProductHistory = await this.productHistoryRepository.findOne(id);
    if (ProductHistory) {
      return ProductHistory;
    }
    throw new HttpException('Not found product history', HttpStatus.NOT_FOUND);
  }

  async update(id: number, currentProductHistory: UpdateProductHistoryDto) {
    this.logger.log(`Request to update Product History: ${id}`);
    await this.productHistoryRepository.update(id, currentProductHistory);
    const updateProductHistory = await this.productHistoryRepository.findOne(id);
    if (updateProductHistory) {
      return updateProductHistory;
    }
    throw new HttpException('Not found product history', HttpStatus.NOT_FOUND);
  }

  async remove(id: number) {
    this.logger.log(`Request to remove Product History: ${id}`);
    const deleteResponse = await this.productHistoryRepository.delete(id);
    if (!deleteResponse.affected) {
      throw new HttpException('Not found product history', HttpStatus.NOT_FOUND);
    }
  }
}
