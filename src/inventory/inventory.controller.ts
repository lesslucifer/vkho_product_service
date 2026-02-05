import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { Cron } from '@nestjs/schedule';
import { INVENTORY_PATTERN } from 'src/constants/inventory.constants';
import { InventoryService } from './inventory.service';
import { FilterInventoryTrendsDto } from './dto/filter-inventory-trends.dto';
import { FilterLowStockDto } from './dto/filter-low-stock.dto';

@Controller()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @MessagePattern(INVENTORY_PATTERN.INVENTORY_GET_TRENDS)
  async getTrends(@Payload() payload: FilterInventoryTrendsDto) {
    return this.inventoryService.getTrends(payload || {});
  }

  @MessagePattern(INVENTORY_PATTERN.INVENTORY_GET_LOW_STOCK)
  async getLowStock(@Payload() payload: FilterLowStockDto) {
    return this.inventoryService.getLowStock(payload || {});
  }

  /**
   * Daily snapshot job: runs at 00:00 (midnight). Stores snapshots for yesterday
   * so the chart can show completed days; "today" remains in progress until next run.
   */
  @Cron('0 0 * * *')
  async handleDailySnapshot() {
    await this.inventoryService.runDailySnapshot();
  }
}
