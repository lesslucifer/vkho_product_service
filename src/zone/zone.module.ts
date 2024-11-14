import { Module } from '@nestjs/common';
import { ZoneService } from './zone.service';
import { ZoneController } from './zone.controller';
import { Zone } from './entities/zone.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([Zone])],
  exports: [TypeOrmModule, ZoneService],
  controllers: [ZoneController],
  providers: [ZoneService],
})
export class ZoneModule {}
