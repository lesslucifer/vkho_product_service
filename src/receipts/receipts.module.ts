import { forwardRef, Module } from '@nestjs/common';
import { ReceiptsService } from './receipts.service';
import { ReceiptsController } from './receipts.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Receipt } from './entities/receipt.entity';
import { ProductModule } from 'src/product/product.module';
import { SuppliersModule } from 'src/suppliers/suppliers.module';
import { ZoneModule } from 'src/zone/zone.module';

@Module({
  imports: [
  TypeOrmModule.forFeature([Receipt]), 
  forwardRef(() => ProductModule), 
  forwardRef(() => SuppliersModule),
  forwardRef(() => ZoneModule)
],
  exports: [TypeOrmModule, ReceiptsService],
  controllers: [ReceiptsController],
  providers: [ReceiptsService]
})
export class ReceiptsModule { }
