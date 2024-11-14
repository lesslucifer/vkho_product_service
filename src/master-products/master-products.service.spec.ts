import { Test, TestingModule } from '@nestjs/testing';
import { MasterProductsService } from './master-products.service';

describe('MasterProductsService', () => {
  let service: MasterProductsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MasterProductsService],
    }).compile();

    service = module.get<MasterProductsService>(MasterProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
