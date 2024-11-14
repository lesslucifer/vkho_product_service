import { Test, TestingModule } from '@nestjs/testing';
import { VanController } from './van.controller';
import { VanService } from './van.service';

describe('ShelfController', () => {
  let controller: VanController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VanController],
      providers: [VanService],
    }).compile();

    controller = module.get<VanController>(VanController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
