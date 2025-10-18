import { Module } from '@nestjs/common';
import { WarehouseGroupService } from './warehouse-group.service';
import { WarehouseGroupController } from './warehouse-group.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WarehouseGroup } from './entities/warehouse-group.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WarehouseGroup])],
  exports: [TypeOrmModule, WarehouseGroupService],
  controllers: [WarehouseGroupController],
  providers: [WarehouseGroupService]
})
export class WarehouseGroupModule {}
