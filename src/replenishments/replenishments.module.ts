import { forwardRef, Module } from '@nestjs/common';
import { ReplenishmentsService } from './replenishments.service';
import { ReplenishmentsController } from './replenishments.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Replenishment } from './entities/replenishment.entity';
import { ProductCategorysModule } from 'src/product-categorys/product-categorys.module';
import { ProductModule } from 'src/product/product.module';
import { MasterProductsModule } from 'src/master-products/master-products.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Replenishment]),
    forwardRef(() => ProductCategorysModule),
    forwardRef(() => ProductModule),
    forwardRef(() => MasterProductsModule)
  ],
  exports: [TypeOrmModule, ReplenishmentsService],
  controllers: [ReplenishmentsController],
  providers: [ReplenishmentsService]
})
export class ReplenishmentsModule { }
