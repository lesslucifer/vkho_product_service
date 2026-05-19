import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiAuditLog } from './entities/api-audit-log.entity';
import { ApiAuditLogController } from './api-audit-log.controller';
import { ApiAuditLogService } from './api-audit-log.service';

@Module({
  imports: [TypeOrmModule.forFeature([ApiAuditLog])],
  controllers: [ApiAuditLogController],
  providers: [ApiAuditLogService],
  exports: [ApiAuditLogService],
})
export class ApiAuditLogModule {}
