import { forwardRef, Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Report } from './entities/report.entity';
import { ProductCategorysModule } from 'src/product-categorys/product-categorys.module';
import { MasterProductsModule } from 'src/master-products/master-products.module';
import { ProductModule } from 'src/product/product.module';
import { WarehouseModule } from 'src/warehouse/warehouse.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    TypeOrmModule.forFeature([Report]),
    forwardRef(() => ProductCategorysModule),
    forwardRef(() => ProductModule),
    forwardRef(() => MasterProductsModule),
    forwardRef(() => WarehouseModule),
    ScheduleModule.forRoot()
  ],
  exports: [TypeOrmModule, ReportsService],
  providers: [ReportsService],
  controllers: [ReportsController]
})
export class ReportsModule {}
