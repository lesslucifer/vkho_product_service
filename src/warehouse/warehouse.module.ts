import { forwardRef, Module } from '@nestjs/common';
import { WarehouseService } from './warehouse.service';
import { WarehouseController } from './warehouse.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Warehouse } from './entities/warehouse.entity';
import { ProductModule } from 'src/product/product.module';
import { WarehouseGroupModule } from 'src/warehouse-group/warehouse-group.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Warehouse]), 
    forwardRef(() => ProductModule),
    forwardRef(() => WarehouseGroupModule)
  ],
  exports: [TypeOrmModule, WarehouseService],
  controllers: [WarehouseController],
  providers: [WarehouseService]
})
export class WarehouseModule {}
