import { ApiProperty } from '@nestjs/swagger';
import { BomStatus } from '../enum/bom-status.enum';
import { ProductStatus } from '../../product/enum/product-status.enum';

export class BomComponentDetailDto {
  @ApiProperty({ description: 'Component ID' })
  id: number;

  @ApiProperty({ description: 'Master Product ID' })
  masterProductId: number;

  @ApiProperty({ description: 'Product name' })
  name: string;

  @ApiProperty({ description: 'Product code' })
  code: string;

  @ApiProperty({ description: 'Required quantity' })
  quantity: number;

  @ApiProperty({ description: 'Current stock level' })
  currentStock: number;

  @ApiProperty({ description: 'Product status', enum: ProductStatus })
  status: ProductStatus;

  @ApiProperty({ description: 'Unit of measurement', required: false })
  unit?: string;

  @ApiProperty({ description: 'Component color', required: false })
  color?: string;

  @ApiProperty({ description: 'Drawer information', required: false })
  drawers?: string;

  @ApiProperty({ description: 'Additional notes', required: false })
  notes?: string;

  @ApiProperty({ description: 'Component creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Component last update date' })
  updatedAt: Date;

  @ApiProperty({ description: 'Component deleted date', required: false })
  deletedAt?: Date;
}

export class BomDetailDto {
  @ApiProperty({ description: 'BOM ID' })
  bomId: number;

  @ApiProperty({ description: 'BOM name' })
  name: string;

  @ApiProperty({ description: 'Warehouse ID' })
  warehouseId: number;

  @ApiProperty({ description: 'BOM status', enum: BomStatus })
  status: BomStatus;

  @ApiProperty({ description: 'List of components with details', type: [BomComponentDetailDto] })
  bomComponents: BomComponentDetailDto[];

  @ApiProperty({ description: 'BOM creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'BOM last update date' })
  updatedAt: Date;

  @ApiProperty({ description: 'BOM deletion date', required: false })
  deletedAt?: Date;
} 