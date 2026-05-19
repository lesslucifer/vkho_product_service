import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { API_AUDIT_LOG_PATTERN } from 'src/constants/api-audit-log.constants';
import { ApiAuditLogService } from './api-audit-log.service';
import { CreateApiAuditLogDto } from './dto/create-api-audit-log.dto';
import { FilterApiAuditLogDto } from './dto/filter-api-audit-log.dto';

@Controller()
export class ApiAuditLogController {
  constructor(private readonly apiAuditLogService: ApiAuditLogService) {}

  @MessagePattern(API_AUDIT_LOG_PATTERN.API_AUDIT_LOG_CREATE)
  create(@Payload() payload: CreateApiAuditLogDto) {
    return this.apiAuditLogService.create(payload);
  }

  @MessagePattern(API_AUDIT_LOG_PATTERN.API_AUDIT_LOG_GET_ALL)
  getAll(@Payload() payload: FilterApiAuditLogDto) {
    return this.apiAuditLogService.getAll(payload);
  }
}
