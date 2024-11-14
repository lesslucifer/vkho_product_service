import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MasterProductsModule } from 'src/master-products/master-products.module';
import { Supplier } from 'src/suppliers/entities/supplier.entity';
import { SuppliersModule } from 'src/suppliers/suppliers.module';
import { ShelfModule } from 'src/shelves/shelf.module';
import { ProductModule } from 'src/product/product.module';
import { Divison } from './entities/divison.entity';
import { DivisonController } from './divison.controller';
import { DivisonService } from './divison.service';


@Module({
  imports: [TypeOrmModule.forFeature([Divison]),
  forwardRef(() => SuppliersModule),
  forwardRef(() => MasterProductsModule),
  forwardRef(() => ShelfModule),
  forwardRef(() => ProductModule),
],
  exports: [TypeOrmModule, DivisonService],
  controllers: [DivisonController],
  providers: [DivisonService],
})
export class DivisonModule {}
