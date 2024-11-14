import { Test, TestingModule } from '@nestjs/testing';
import { ParentProductCategorysController } from './parent-product-categorys.controller';
import { ParentProductCategorysService } from './parent-product-categorys.service';

describe('ParentProductCategorysController', () => {
  let controller: ParentProductCategorysController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ParentProductCategorysController],
      providers: [ParentProductCategorysService],
    }).compile();

    controller = module.get<ParentProductCategorysController>(ParentProductCategorysController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
