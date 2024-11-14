import { Test, TestingModule } from '@nestjs/testing';
import { ProductCategorysService } from './product-categorys.service';

describe('ProductCategorysService', () => {
  let service: ProductCategorysService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductCategorysService],
    }).compile();

    service = module.get<ProductCategorysService>(ProductCategorysService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
