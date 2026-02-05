import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventorySnapshot } from './entities/inventory-snapshot.entity';
import { Product } from 'src/product/entities/product.entity';
import { Warehouse } from 'src/warehouse/entities/warehouse.entity';
import { Replenishment } from 'src/replenishments/entities/replenishment.entity';
import { FilterInventoryTrendsDto } from './dto/filter-inventory-trends.dto';
import { FilterLowStockDto } from './dto/filter-low-stock.dto';
import { ProductStatus } from 'src/product/enum/product-status.enum';
import { WarehouseStatus } from 'src/warehouse/enum/status.enum';
import { ReplenishmentStatus } from 'src/replenishments/enums/replenishment-status.enum';

const ON_HAND_STATUSES = [
  ProductStatus.STORED,
  ProductStatus.MOVING,
  ProductStatus.TEMPORARY,
  ProductStatus.REALLOCATE,
  ProductStatus.NEW,
];

function formatDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function getDatesBetween(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const current = new Date(start);
  while (current <= end) {
    dates.push(formatDateLocal(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectRepository(InventorySnapshot)
    private readonly snapshotRepository: Repository<InventorySnapshot>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Warehouse)
    private readonly warehouseRepository: Repository<Warehouse>,
    @InjectRepository(Replenishment)
    private readonly replenishmentRepository: Repository<Replenishment>,
  ) {}

  /**
   * Resolve startDate and endDate with defaults:
   * - endDate missing → today (local)
   * - startDate missing → 6 days before endDate (7 days including endDate)
   */
  resolveDateRange(startDate?: string, endDate?: string): { startDate: string; endDate: string } {
    const end = endDate ? endDate : formatDateLocal(new Date());
    const endD = parseDate(end);
    const startD = new Date(endD);
    startD.setDate(startD.getDate() - 6);
    const start = startDate ? startDate : formatDateLocal(startD);
    return { startDate: start, endDate: end };
  }

  /**
   * GET inventory trends: read from inventory_snapshots, fill missing days, return { data }.
   */
  async getTrends(payload: FilterInventoryTrendsDto): Promise<{
    data: Array<{ date: string; totalQuantity: number; totalItems: number }>;
  }> {
    const { startDate, endDate } = this.resolveDateRange(payload.startDate, payload.endDate);
    const warehouseId = payload.warehouseId;

    const qb = this.snapshotRepository
      .createQueryBuilder('s')
      .select('s.snapshotDate', 'date')
      .addSelect('SUM(s.totalQuantity)', 'totalQuantity')
      .addSelect('SUM(s.totalItems)', 'totalItems')
      .where('s.snapshotDate >= :startDate', { startDate })
      .andWhere('s.snapshotDate <= :endDate', { endDate });

    if (warehouseId != null) {
      qb.andWhere('s.warehouseId = :warehouseId', { warehouseId });
    }
    qb.groupBy('s.snapshotDate').orderBy('s.snapshotDate', 'ASC');

    const rows = await qb.getRawMany();

    const byDate = new Map<string, { totalQuantity: number; totalItems: number }>();
    for (const r of rows) {
      const date = typeof r.date === 'string' ? r.date : (r.date as Date).toISOString().slice(0, 10);
      byDate.set(date, {
        totalQuantity: Number(r.totalQuantity) || 0,
        totalItems: Number(r.totalItems) || 0,
      });
    }

    const allDates = getDatesBetween(startDate, endDate);
    const data = allDates.map((date) => {
      const v = byDate.get(date);
      return {
        date,
        totalQuantity: v ? v.totalQuantity : 0,
        totalItems: v ? v.totalItems : 0,
      };
    });

    return { data };
  }

  /**
   * GET low stock: items where currentQuantity <= minQuantity (min from Replenishment).
   */
  async getLowStock(payload: FilterLowStockDto): Promise<{
    count: number;
    data: Array<{
      productId: string | number;
      productName: string;
      currentQuantity: number;
      minQuantity: number;
      isLowStock: boolean;
    }>;
  }> {
    const warehouseId = payload.warehouseId;

    const qb = this.replenishmentRepository
      .createQueryBuilder('rep')
      .leftJoinAndSelect('rep.masterProduct', 'mp')
      .where('rep.status = :status', { status: ReplenishmentStatus.ENABLE });

    if (warehouseId != null) {
      qb.andWhere('rep.warehouseId = :warehouseId', { warehouseId });
    }

    const replenishments = await qb.getMany();
    const data: Array<{
      productId: string | number;
      productName: string;
      currentQuantity: number;
      minQuantity: number;
      isLowStock: boolean;
    }> = [];

    for (const rep of replenishments) {
      const masterProduct = rep.masterProduct;
      if (!masterProduct) continue;

      const whId = rep.warehouseId;
      const minQuantity = rep.min;

      const sumResult = await this.productRepository
        .createQueryBuilder('product')
        .select('SUM(product.totalQuantity)', 'total')
        .where('product.masterProductId = :masterProductId', { masterProductId: masterProduct.id })
        .andWhere('product.warehouseId = :warehouseId', { warehouseId: whId })
        .andWhere('product.status IN (:...statuses)', { statuses: ON_HAND_STATUSES })
        .getRawOne();

      const currentQuantity = Number(sumResult?.total) || 0;
      const isLowStock = currentQuantity <= minQuantity;

      if (isLowStock) {
        data.push({
          productId: masterProduct.id,
          productName: masterProduct.name || rep.productName || '',
          currentQuantity,
          minQuantity,
          isLowStock: true,
        });
      }
    }

    return { count: data.length, data };
  }

  /**
   * Daily job: compute snapshot for yesterday per warehouse and upsert.
   * Snapshots are stored for yesterday so "today" can remain in progress; document in code.
   */
  async runDailySnapshot(): Promise<void> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const snapshotDate = formatDateLocal(yesterday);

    const warehouses = await this.warehouseRepository.find({
      where: { status: WarehouseStatus.ENABLE },
    });

    for (const wh of warehouses) {
      const [sumResult, countResult] = await Promise.all([
        this.productRepository
          .createQueryBuilder('product')
          .select('SUM(product.totalQuantity)', 'total')
          .where('product.warehouseId = :warehouseId', { warehouseId: wh.id })
          .andWhere('product.status IN (:...statuses)', { statuses: ON_HAND_STATUSES })
          .getRawOne(),
        this.productRepository
          .createQueryBuilder('product')
          .select('COUNT(DISTINCT product.masterProductId)', 'cnt')
          .where('product.warehouseId = :warehouseId', { warehouseId: wh.id })
          .andWhere('product.status IN (:...statuses)', { statuses: ON_HAND_STATUSES })
          .getRawOne(),
      ]);

      const totalQuantity = Number(sumResult?.total) || 0;
      const totalItems = Number(countResult?.cnt) || 0;

      let snapshot = await this.snapshotRepository.findOne({
        where: { warehouseId: wh.id, snapshotDate },
      });
      if (snapshot) {
        snapshot.totalQuantity = totalQuantity;
        snapshot.totalItems = totalItems;
        await this.snapshotRepository.save(snapshot);
      } else {
        snapshot = this.snapshotRepository.create({
          warehouseId: wh.id,
          snapshotDate,
          totalQuantity,
          totalItems,
        });
        await this.snapshotRepository.save(snapshot);
      }
    }

    this.logger.log(`Daily inventory snapshot completed for date ${snapshotDate}, warehouses: ${warehouses.length}`);
  }
}
