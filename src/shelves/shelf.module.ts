import { forwardRef, Module } from '@nestjs/common';
import { ShelfService } from './shelf.service';
import { ShelfController } from './shelf.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Shelf } from './entities/shelf.entity';
import { ProductCategorysModule } from 'src/product-categorys/product-categorys.module';
import { BlocksModule } from 'src/blocks/blocks.module';
import { RacksModule } from 'src/racks/racks.module';
import { ProductModule } from 'src/product/product.module';
import { ParentProductCategorysModule } from 'src/parent-product-categorys/parent-product-categorys.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Shelf]),
    forwardRef(() => ParentProductCategorysModule),
    forwardRef(() => BlocksModule),
    forwardRef(() => RacksModule),
    forwardRef(() => ProductModule)
  ],
  exports: [TypeOrmModule, ShelfService],
  controllers: [ShelfController],
  providers: [ShelfService]
})
export class ShelfModule { }
