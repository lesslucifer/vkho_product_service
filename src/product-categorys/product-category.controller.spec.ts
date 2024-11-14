import { Test, TestingModule } from '@nestjs/testing';
import { ProductCategorysController } from './product-categorys.controller';
import { ProductCategorysService } from './product-categorys.service';

describe('ProductCategorysController', () => {
  let controller: ProductCategorysController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductCategorysController],
      providers: [ProductCategorysService],
    }).compile();

    controller = module.get<ProductCategorysController>(ProductCategorysController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
