import { Test, TestingModule } from '@nestjs/testing';
import { ParentProductCategorysService } from './parent-product-categorys.service';

describe('ProductCategorysService', () => {
  let service: ParentProductCategorysService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ParentProductCategorysService],
    }).compile();

    service = module.get<ParentProductCategorysService>(ParentProductCategorysService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
