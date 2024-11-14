import { Module } from '@nestjs/common';
import { ProductModule } from './product/product.module';
import { ZoneModule } from './zone/zone.module';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { ProductCategorysModule } from './product-categorys/product-categorys.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { RacksModule } from './racks/racks.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { BlocksModule } from './blocks/blocks.module';
import { ProductHistorysModule } from './product-historys/product-historys.module';
import { ReplenishmentsModule } from './replenishments/replenishments.module';
import { ShelfModule } from './shelves/shelf.module';
import { WarehouseModule } from './warehouse/warehouse.module';
import { MasterProductsModule } from './master-products/master-products.module';
import { ReportsModule } from './reports/reports.module';
import { ParentProductCategorysModule } from './parent-product-categorys/parent-product-categorys.module';
import { DivisonModule } from './divison/divison.module';
import { VanModule } from './vans/van.module';

@Module({
  imports: [
    ConfigModule.forRoot(), 
    DatabaseModule, 
    ProductModule, 
    ZoneModule, 
    ProductCategorysModule, 
    ParentProductCategorysModule,
    DivisonModule,
    SuppliersModule, 
    RacksModule, 
    ReceiptsModule, 
    BlocksModule, 
    ProductHistorysModule, 
    ReplenishmentsModule, 
    ShelfModule, WarehouseModule, MasterProductsModule, ReportsModule,
    VanModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
