import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { UserExpiration } from './entities/user-expiration.entity';

/** Normalize DB value (Date or string) to YYYY-MM-DD. */
function toDateString(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

@Injectable()
export class UserExpirationService {
  constructor(
    @InjectRepository(UserExpiration)
    private readonly repo: Repository<UserExpiration>,
  ) {}

  async getExpiration(userId: string): Promise<{ expirationDate: string | null }> {
    const row = await this.repo.findOne({ where: { userId } });
    const expirationDate = toDateString(row?.expirationDate ?? null);
    return { expirationDate };
  }

  async setExpiration(userId: string, expirationDate: string | null): Promise<void> {
    const date =
      expirationDate != null ? new Date(expirationDate) : null;
    await this.repo.upsert({ userId, expirationDate: date }, { conflictPaths: ['userId'] });
  }

  async getExpirationsByUserIds(userIds: string[]): Promise<Record<string, string | null>> {
    if (!userIds.length) return {};
    const rows = await this.repo.find({
      where: userIds.map((userId) => ({ userId })),
    });
    const result: Record<string, string | null> = {};
    for (const id of userIds) {
      const row = rows.find((r) => r.userId === id);
      result[id] = toDateString(row?.expirationDate ?? null);
    }
    return result;
  }

  async getExpiredUserIds(): Promise<string[]> {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const rows = await this.repo.find({
      where: { expirationDate: LessThan(today) },
      select: ['userId'],
    });
    return rows.map((r) => r.userId);
  }
}
