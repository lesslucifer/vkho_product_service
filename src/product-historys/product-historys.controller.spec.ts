import { Test, TestingModule } from '@nestjs/testing';
import { ProductHistorysController } from './product-historys.controller';
import { ProductHistorysService } from './product-historys.service';

describe('ProductHistorysController', () => {
  let controller: ProductHistorysController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductHistorysController],
      providers: [ProductHistorysService],
    }).compile();

    controller = module.get<ProductHistorysController>(ProductHistorysController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
