import { PartialType } from '@nestjs/mapped-types';
import { Divison } from 'src/divison/entities/divison.entity';
import { ReceiptStatus } from 'src/receipts/enums/receipt-status.enum';
import { CreateParentProductCategoryDto } from './create-parent-product-category.dto';

export class UpdateParentProductCategoryDto extends PartialType(CreateParentProductCategoryDto) {
  updateDate: Date;
  id: number;
  status: ReceiptStatus;
  divison: Divison;
}
