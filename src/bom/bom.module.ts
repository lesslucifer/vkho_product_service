import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { Bom } from './entities/bom.entity';
import { BomService } from './bom.service';
import { BomController } from './bom.controller';
import { BomComponent } from '../bom-component/entities/bom-component.entity';
import { BomFinishedProduct } from '../bom-finished-product/entities/bom-finished-product.entity';
import { Crafting } from './entities/crafting.entity';
import { ProductModule } from '../product/product.module';
import { SuppliersModule } from '../suppliers/suppliers.module';
import { ProductCategorysModule } from '../product-categorys/product-categorys.module';
import { ReplenishmentsModule } from '../replenishments/replenishments.module';
import { MasterProductsModule } from '../master-products/master-products.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bom, BomComponent, BomFinishedProduct, Crafting]),
    ConfigModule,
    HttpModule,
    forwardRef(() => ProductModule),
    forwardRef(() => SuppliersModule),
    forwardRef(() => ProductCategorysModule),
    forwardRef(() => ReplenishmentsModule),
    forwardRef(() => MasterProductsModule)
  ],
  controllers: [BomController],
  providers: [BomService],
  exports: [BomService]
})
export class BomModule {} 