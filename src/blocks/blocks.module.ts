import { forwardRef, Module } from '@nestjs/common';
import { BlocksService } from './blocks.service';
import { BlocksController } from './blocks.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Block } from './entities/block.entity';
import { ShelfModule } from 'src/shelves/shelf.module';

@Module({
  imports: [TypeOrmModule.forFeature([Block]), forwardRef(() => ShelfModule)],
  exports: [TypeOrmModule, BlocksService],
  controllers: [BlocksController],
  providers: [BlocksService]
})
export class BlocksModule {}
