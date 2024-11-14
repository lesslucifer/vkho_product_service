import { PartialType } from '@nestjs/mapped-types';
import { BlockStatus } from '../enums/block-status.enum';
import { CreateBlockDto } from './create-block.dto';

export class UpdateBlockDto extends PartialType(CreateBlockDto) {
  id: number;
  status: BlockStatus;
}
