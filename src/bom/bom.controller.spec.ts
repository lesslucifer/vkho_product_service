import { Test, TestingModule } from '@nestjs/testing';
import { BomController } from './bom.controller';
import { BomService } from './bom.service';

describe('BomController', () => {
  let controller: BomController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BomController],
      providers: [BomService],
    }).compile();

    controller = module.get<BomController>(BomController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
