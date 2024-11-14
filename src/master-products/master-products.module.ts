import { forwardRef, Module } from '@nestjs/common';
import { MasterProductsService } from './master-products.service';
import { MasterProductsController } from './master-products.controller';
import { MasterProduct } from './entities/master-product.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductCategorysModule } from 'src/product-categorys/product-categorys.module';
import { SuppliersModule } from 'src/suppliers/suppliers.module';
import { ProductModule } from 'src/product/product.module';
import { ConfigModule } from '@nestjs/config';
import { ReplenishmentsModule } from 'src/replenishments/replenishments.module';
import { HttpModule, HttpService } from '@nestjs/axios';

@Module({
  imports: [
    TypeOrmModule.forFeature([MasterProduct]),
    forwardRef(() => ProductCategorysModule),
    forwardRef(() => SuppliersModule),
    forwardRef(() => ProductModule),
    forwardRef(() => ReplenishmentsModule),
    ConfigModule,
    HttpModule
  ],
  exports: [TypeOrmModule, MasterProductsService],
  controllers: [MasterProductsController],
  providers: [MasterProductsService]
})
export class MasterProductsModule {}
