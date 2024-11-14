import { PartialType } from '@nestjs/mapped-types';
import { Supplier } from 'src/suppliers/entities/supplier.entity';
import { ReceiptStatus } from '../enums/receipt-status.enum';
import { CreateReceiptDto } from './create-receipt.dto';

export class UpdateReceiptDto extends PartialType(CreateReceiptDto) {
  id: number;
  supplier: Supplier;
  status: ReceiptStatus;
}
