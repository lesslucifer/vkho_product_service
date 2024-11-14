import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductCategorysService } from './product-categorys.service';
import { ProductCategorysController } from './product-categorys.controller';
import { ProductCategory } from './entities/product-category.entity';
import { MasterProductsModule } from 'src/master-products/master-products.module';
import { Supplier } from 'src/suppliers/entities/supplier.entity';
import { SuppliersModule } from 'src/suppliers/suppliers.module';
import { ShelfModule } from 'src/shelves/shelf.module';
import { ProductModule } from 'src/product/product.module';
import { ParentProductCategorysModule } from 'src/parent-product-categorys/parent-product-categorys.module';
import { HttpModule } from '@nestjs/axios';


@Module({
  imports: [TypeOrmModule.forFeature([ProductCategory]),
  forwardRef(() => SuppliersModule),
  forwardRef(() => MasterProductsModule),
  forwardRef(() => ShelfModule),
  forwardRef(() => ProductModule),
  forwardRef(() => ParentProductCategorysModule),
  HttpModule
],
  exports: [TypeOrmModule, ProductCategorysService],
  controllers: [ProductCategorysController],
  providers: [ProductCategorysService],
})
export class ProductCategorysModule {}
