import { PartialType } from '@nestjs/mapped-types';
import { WarehouseStatus } from '../enum/status.enum';
import { CreateWarehouseDto } from './create-warehouse.dto';

export class UpdateWarehouseDto extends PartialType(CreateWarehouseDto) {
  id: number;
  status: WarehouseStatus;
}
