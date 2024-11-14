import { Module } from '@nestjs/common';
import { ProductHistorysService } from './product-historys.service';
import { ProductHistorysController } from './product-historys.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductHistory } from './entities/product-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProductHistory])],
  exports: [TypeOrmModule, ProductHistorysService],
  controllers: [ProductHistorysController],
  providers: [ProductHistorysService]
})
export class ProductHistorysModule {}
