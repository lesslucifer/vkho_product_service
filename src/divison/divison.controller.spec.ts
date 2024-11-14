import { Test, TestingModule } from '@nestjs/testing';
import { DivisonController } from './divison.controller';
import { DivisonService } from './divison.service';

describe('DivisonController', () => {
  let controller: DivisonController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DivisonController],
      providers: [DivisonService],
    }).compile();

    controller = module.get<DivisonController>(DivisonController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
