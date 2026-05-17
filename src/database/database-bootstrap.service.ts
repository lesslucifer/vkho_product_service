import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Warehouse } from 'src/warehouse/entities/warehouse.entity';

/**
 * Applies idempotent schema fixes on startup (see scripts/add-warehouse-logo-url.sql).
 */
@Injectable()
export class DatabaseBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseBootstrapService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    await this.ensureWarehouseLogoUrlColumn();
  }

  private async ensureWarehouseLogoUrlColumn(): Promise<void> {
    const metadata = this.dataSource.getMetadata(Warehouse);
    const tableName = metadata.tableName;
    const logoColumn = metadata.findColumnWithPropertyName('logoUrl');

    if (!logoColumn) {
      this.logger.warn('Warehouse.logoUrl not mapped; skipping logo column migration');
      return;
    }

    const columnName = logoColumn.databaseName;

    try {
      await this.dataSource.query(
        `ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "${columnName}" text`,
      );
      this.logger.log(`Ensured column ${tableName}.${columnName} exists (warehouse logo URL)`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to ensure ${tableName}.${columnName}: ${message}`);
      throw error;
    }
  }
}
