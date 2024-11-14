import { forwardRef, Module } from '@nestjs/common';
import { RacksService } from './racks.service';
import { RacksController } from './racks.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rack } from './entities/rack.entity';
import { ProductCategorysModule } from 'src/product-categorys/product-categorys.module';
import { ShelfModule } from 'src/shelves/shelf.module';
import { ParentProductCategorysModule } from 'src/parent-product-categorys/parent-product-categorys.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Rack]), 
    forwardRef(() => ParentProductCategorysModule), 
    forwardRef(() => ShelfModule),
  ],
  exports: [TypeOrmModule, RacksService],
  controllers: [RacksController],
  providers: [RacksService]
})
export class RacksModule {}
