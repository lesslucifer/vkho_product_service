import { forwardRef, Module } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { SuppliersController } from './suppliers.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Supplier } from './entities/supplier.entity';
import { ProductCategorysModule } from 'src/product-categorys/product-categorys.module';
import { MasterProductsModule } from 'src/master-products/master-products.module';
import { ProductModule } from 'src/product/product.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Supplier]),
   forwardRef(() => ProductCategorysModule),
   forwardRef(() => MasterProductsModule),
   forwardRef(() => ProductModule)
  ],
  exports: [TypeOrmModule, SuppliersService],
  controllers: [SuppliersController],
  providers: [SuppliersService]
})
export class SuppliersModule {}
