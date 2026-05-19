import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
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
import { BomModule } from './bom/bom.module';
import { WarehouseGroupModule } from './warehouse-group/warehouse-group.module';
import { InventoryModule } from './inventory/inventory.module';
import { UserExpirationModule } from './user-expiration/user-expiration.module';
import { ApiAuditLogModule } from './api-audit-log/api-audit-log.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    DatabaseModule,
    UserExpirationModule,
    ApiAuditLogModule,
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
    ShelfModule, WarehouseModule, WarehouseGroupModule, MasterProductsModule, ReportsModule,
    VanModule,
    BomModule,
    InventoryModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
