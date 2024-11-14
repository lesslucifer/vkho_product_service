import { Test, TestingModule } from '@nestjs/testing';
import { MasterProductsController } from './master-products.controller';
import { MasterProductsService } from './master-products.service';

describe('MasterProductsController', () => {
  let controller: MasterProductsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MasterProductsController],
      providers: [MasterProductsService],
    }).compile();

    controller = module.get<MasterProductsController>(MasterProductsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
