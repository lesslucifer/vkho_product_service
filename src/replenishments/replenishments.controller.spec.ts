import { Test, TestingModule } from '@nestjs/testing';
import { ReplenishmentsController } from './replenishments.controller';
import { ReplenishmentsService } from './replenishments.service';

describe('ReplenishmentsController', () => {
  let controller: ReplenishmentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReplenishmentsController],
      providers: [ReplenishmentsService],
    }).compile();

    controller = module.get<ReplenishmentsController>(ReplenishmentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
