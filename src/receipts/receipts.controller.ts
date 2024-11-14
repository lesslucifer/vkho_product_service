import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ReceiptsService } from './receipts.service';
import { CreateReceiptDto } from './dto/create-receipt.dto';
import { UpdateReceiptDto } from './dto/update-receipt.dto';
import { RECEIPT_PATTERN } from 'src/constants/receipt.constants';
import { Receipt } from './entities/receipt.entity';
import { PaginationDto } from 'src/common/pagination.dto';
import { ReceiptFilter } from './dto/filter-receipt.dto';
import { IdsDTO } from 'src/common/list-id.dto';
import { ConfirmReceipt } from './dto/confirm-receipt.dto';
import { ResponseDTO } from 'src/common/response.dto';

@Controller()
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @MessagePattern(RECEIPT_PATTERN.RECEIPT_CREATE)
  create(@Payload() createReceiptDto: CreateReceiptDto): Promise<Receipt> {
    return this.receiptsService.create(createReceiptDto);
  }

  @MessagePattern(RECEIPT_PATTERN.RECEIPT_GET_ALL)
  async findAll(@Payload() receiptFilter: ReceiptFilter): Promise<ResponseDTO> {

    receiptFilter.page = Number(receiptFilter?.page)
    receiptFilter.limit = Number(receiptFilter?.limit)

    const receipts = await this.receiptsService.findAll({
      ...receiptFilter
    });
    return receipts;
  }

  @MessagePattern(RECEIPT_PATTERN.RECEIPT_GET_ONE)
  findOne(@Payload() id: number): Promise<Receipt> {
    return this.receiptsService.findOne(id);
  }

  @MessagePattern(RECEIPT_PATTERN.RECEIPT_UPDATE)
  update(@Payload() currentReceipt: UpdateReceiptDto): Promise<Receipt> {
    return this.receiptsService.update(currentReceipt.id, currentReceipt);
  }

  @MessagePattern(RECEIPT_PATTERN.RECEIPT_CONFIRM)
  confirm(@Payload() currentReceipt: ConfirmReceipt): Promise<Receipt> {
    return this.receiptsService.confirm(currentReceipt.id, currentReceipt);
  }

  @MessagePattern(RECEIPT_PATTERN.RECEIPT_DELETE)
  remove(@Payload() id: number) {
    return this.receiptsService.remove(id);
  }

  @MessagePattern(RECEIPT_PATTERN.RECEIPT_DELETES)
  removes(@Payload() idsDTO: IdsDTO) {
    return this.receiptsService.removes(idsDTO);
  }
}
