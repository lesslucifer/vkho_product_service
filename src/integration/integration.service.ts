import { Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { INTEGRATION_PATTERN } from 'src/constants/integration.constants';
import {
  CreateApiKeyDto,
  ListApiKeysDto,
  RevokeApiKeyDto,
  ValidateApiKeyDto,
  ValidateApiKeyResult
} from './dto/api-key.dto';
import { WarehouseApiKey } from './entities/warehouse-api-key.entity';

export type CreateApiKeyResult = {
  id: number;
  warehouseId: number;
  keyPrefix: string;
  scopes: string[];
  apiKey: string;
  createdAt: Date;
};

@Injectable()
export class IntegrationService {
  private readonly logger = new Logger(IntegrationService.name);

  constructor(
    @InjectRepository(WarehouseApiKey)
    private readonly apiKeyRepository: Repository<WarehouseApiKey>
  ) {}

  async createApiKey(dto: CreateApiKeyDto): Promise<CreateApiKeyResult> {
    if (!dto.warehouseId) {
      throw new RpcException('warehouseId is required');
    }
    if (!dto.scopes?.length) {
      throw new RpcException('At least one scope is required');
    }

    const apiKey = `vkho_${randomBytes(24).toString('hex')}`;
    const keyPrefix = apiKey.substring(0, 12);
    const keyHash = this.hashKey(apiKey);

    const entity = this.apiKeyRepository.create({
      warehouseId: dto.warehouseId,
      keyPrefix,
      keyHash,
      scopes: dto.scopes,
      createdBy: dto.createdBy,
      createdAt: new Date(),
      revokedAt: null,
      lastUsedAt: null
    });

    const saved = await this.apiKeyRepository.save(entity);
    this.logger.log(`Created API key ${saved.id} for warehouse ${dto.warehouseId}`);

    return {
      id: saved.id,
      warehouseId: saved.warehouseId,
      keyPrefix: saved.keyPrefix,
      scopes: saved.scopes,
      apiKey,
      createdAt: saved.createdAt
    };
  }

  async listApiKeys(dto: ListApiKeysDto) {
    if (!dto.warehouseId) {
      throw new RpcException('warehouseId is required');
    }

    const keys = await this.apiKeyRepository.find({
      where: { warehouseId: dto.warehouseId },
      order: { id: 'DESC' }
    });

    return keys
      .filter((key) => !key.revokedAt)
      .map((key) => ({
        id: key.id,
        warehouseId: key.warehouseId,
        keyPrefix: key.keyPrefix,
        scopes: key.scopes,
        createdBy: key.createdBy,
        createdAt: key.createdAt,
        lastUsedAt: key.lastUsedAt
      }));
  }

  async revokeApiKey(dto: RevokeApiKeyDto) {
    const key = await this.apiKeyRepository.findOne({ where: { id: dto.id, warehouseId: dto.warehouseId } });
    if (!key) {
      throw new RpcException('API key not found');
    }
    if (key.revokedAt) {
      return { success: true };
    }
    key.revokedAt = new Date();
    await this.apiKeyRepository.save(key);
    return { success: true };
  }

  async validateApiKey(dto: ValidateApiKeyDto): Promise<ValidateApiKeyResult> {
    const apiKey = String(dto.apiKey || '').trim();
    if (!apiKey.startsWith('vkho_') || apiKey.length < 20) {
      return { valid: false };
    }

    const keyPrefix = apiKey.substring(0, 12);
    const keyHash = this.hashKey(apiKey);

    const record = await this.apiKeyRepository.findOne({ where: { keyPrefix, keyHash } });
    if (!record || record.revokedAt) {
      return { valid: false };
    }

    if (dto.requiredScope && !record.scopes.includes(dto.requiredScope)) {
      return { valid: false };
    }

    record.lastUsedAt = new Date();
    await this.apiKeyRepository.save(record);

    return {
      valid: true,
      keyId: record.id,
      warehouseId: record.warehouseId,
      keyPrefix: record.keyPrefix,
      scopes: record.scopes as ValidateApiKeyResult['scopes']
    };
  }

  private hashKey(apiKey: string): string {
    return createHash('sha256').update(apiKey).digest('hex');
  }
}
