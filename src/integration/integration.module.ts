import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegrationController } from './integration.controller';
import { IntegrationService } from './integration.service';
import { WarehouseApiKey } from './entities/warehouse-api-key.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WarehouseApiKey])],
  controllers: [IntegrationController],
  providers: [IntegrationService],
  exports: [IntegrationService]
})
export class IntegrationModule {}
