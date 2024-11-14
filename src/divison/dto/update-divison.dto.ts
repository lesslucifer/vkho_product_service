import { PartialType } from '@nestjs/mapped-types';
import { ReceiptStatus } from 'src/receipts/enums/receipt-status.enum';
import { DivisonStatus } from '../enums/divison-status.enum';
import { CreateDivisonDto } from './create-divison.dto';

export class UpdateDivisonDto extends PartialType(CreateDivisonDto) {
  updateDate: Date;
  id: number;
  status: DivisonStatus;
}
