import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParentProductCategorysService } from './parent-product-categorys.service';
import { ParentProductCategorysController } from './parent-product-categorys.controller';
import { ParentProductCategory } from './entities/parent-product-category.entity';
import { MasterProductsModule } from 'src/master-products/master-products.module';
import { Supplier } from 'src/suppliers/entities/supplier.entity';
import { SuppliersModule } from 'src/suppliers/suppliers.module';
import { ShelfModule } from 'src/shelves/shelf.module';
import { ProductModule } from 'src/product/product.module';
import { DivisonModule } from 'src/divison/divison.module';


@Module({
  imports: [TypeOrmModule.forFeature([ParentProductCategory]),
  forwardRef(() => SuppliersModule),
  forwardRef(() => MasterProductsModule),
  forwardRef(() => ShelfModule),
  forwardRef(() => ProductModule),
  forwardRef(() => DivisonModule),
],
  exports: [TypeOrmModule, ParentProductCategorysService],
  controllers: [ParentProductCategorysController],
  providers: [ParentProductCategorysService],
})
export class ParentProductCategorysModule {}
