import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventorySnapshot } from './entities/inventory-snapshot.entity';
import { Product } from 'src/product/entities/product.entity';
import { Warehouse } from 'src/warehouse/entities/warehouse.entity';
import { Replenishment } from 'src/replenishments/entities/replenishment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventorySnapshot,
      Product,
      Warehouse,
      Replenishment,
    ]),
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
