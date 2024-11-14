import { forwardRef, Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { RacksModule } from 'src/racks/racks.module';
import { ProductCategorysModule } from 'src/product-categorys/product-categorys.module';
import { SuppliersModule } from 'src/suppliers/suppliers.module';
import { ReceiptsModule } from 'src/receipts/receipts.module';
import { ZoneModule } from 'src/zone/zone.module';
import { MasterProductsModule } from 'src/master-products/master-products.module';
import { BlocksModule } from 'src/blocks/blocks.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product]), 
    forwardRef(() => RacksModule), 
    forwardRef(() => ProductCategorysModule),
    forwardRef(() => SuppliersModule),
    forwardRef(() => ReceiptsModule),
    forwardRef(() => ZoneModule),
    forwardRef(() => MasterProductsModule),
    forwardRef(() => BlocksModule)
  ],
  exports: [TypeOrmModule, ProductService],
  controllers: [ProductController],
  providers: [ProductService],
})
export class ProductModule {}
