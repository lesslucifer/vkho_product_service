import { forwardRef, Module } from '@nestjs/common';
import { VanService } from './van.service';
import { VanController } from './van.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Van } from './entities/van.entity';
import { ProductCategorysModule } from 'src/product-categorys/product-categorys.module';
import { BlocksModule } from 'src/blocks/blocks.module';
import { RacksModule } from 'src/racks/racks.module';
import { ProductModule } from 'src/product/product.module';
import { ParentProductCategorysModule } from 'src/parent-product-categorys/parent-product-categorys.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Van]),
    forwardRef(() => ParentProductCategorysModule),
    forwardRef(() => BlocksModule),
    forwardRef(() => RacksModule),
    forwardRef(() => ProductModule)
  ],
  exports: [TypeOrmModule, VanService],
  controllers: [VanController],
  providers: [VanService]
})
export class VanModule { }
