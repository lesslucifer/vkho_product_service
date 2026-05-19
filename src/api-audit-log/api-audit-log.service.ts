import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiAuditLog } from './entities/api-audit-log.entity';
import { CreateApiAuditLogDto } from './dto/create-api-audit-log.dto';
import { FilterApiAuditLogDto } from './dto/filter-api-audit-log.dto';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

@Injectable()
export class ApiAuditLogService {
  constructor(
    @InjectRepository(ApiAuditLog)
    private readonly repo: Repository<ApiAuditLog>,
  ) {}

  async create(payload: CreateApiAuditLogDto): Promise<ApiAuditLog> {
    const entry = this.repo.create({
      warehouseId: payload.warehouseId,
      userId: payload.userId ?? null,
      user: payload.user,
      method: (payload.method || 'GET').toUpperCase(),
      endpoint: (payload.endpoint || '').split('?')[0] || payload.endpoint,
      statusCode: payload.statusCode ?? null,
    });
    return this.repo.save(entry);
  }

  async getAll(filter: FilterApiAuditLogDto): Promise<{ data: ApiAuditLog[]; totalItem: number }> {
    const page = Math.max(Number(filter.page) || DEFAULT_PAGE, 1);
    const limit = Math.min(Math.max(Number(filter.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);
    const skip = (page - 1) * limit;

    const [data, totalItem] = await this.repo.findAndCount({
      where: { warehouseId: filter.warehouseId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { data, totalItem };
  }
}
