import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ResponseDTO } from 'src/common/response.dto';
import { BLOCK_PATTERN } from 'src/constants/block.constants';
import { BlocksService } from './blocks.service';
import { AddUserToBlock } from './dto/add-user-block.dto';
import { CreateBlockDto } from './dto/create-block.dto';
import { BlockFilter } from './dto/filter-block.dto';
import { UpdateBlockDto } from './dto/update-block.dto';
import { Block } from './entities/block.entity';

@Controller()
export class BlocksController {
  constructor(private readonly blocksService: BlocksService) {}

  @MessagePattern(BLOCK_PATTERN.BLOCK_CREATE)
  create(@Payload() createBlockDto: CreateBlockDto) {
    return this.blocksService.create(createBlockDto);
  }

  @MessagePattern(BLOCK_PATTERN.BLOCK_GET_ALL)
  async findAll(@Payload() blockFilter: BlockFilter) {
    blockFilter.page = Number(blockFilter?.page)
    blockFilter.limit = Number(blockFilter?.limit)

    const blocks: ResponseDTO = await this.blocksService.findAll({
      ...blockFilter
    });
    return blocks;
  }

  @MessagePattern(BLOCK_PATTERN.BLOCK_GET_ONE)
  findOne(@Payload() id: number) {
    return this.blocksService.findOne(id);
  }

  @MessagePattern(BLOCK_PATTERN.BLOCK_UPDATE)
  update(@Payload() updateBlockDto: UpdateBlockDto) {
    return this.blocksService.update(updateBlockDto.id, updateBlockDto);
  }

  @MessagePattern(BLOCK_PATTERN.BLOCK_ADD_USER)
  addUser(@Payload() add: AddUserToBlock) {
    return this.blocksService.addUser(add);
  }

  @MessagePattern(BLOCK_PATTERN.BLOCK_UPDATE_USER)
  updateUser(@Payload() add: AddUserToBlock) {
    return this.blocksService.updateUser(add);
  }

  @MessagePattern(BLOCK_PATTERN.BLOCK_DELETE)
  remove(@Payload() id: number) {
    return this.blocksService.remove(id);
  }
}
