import { Test, TestingModule } from '@nestjs/testing';
import { ProductHistorysService } from './product-historys.service';

describe('ProductHistorysService', () => {
  let service: ProductHistorysService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductHistorysService],
    }).compile();

    service = module.get<ProductHistorysService>(ProductHistorysService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
