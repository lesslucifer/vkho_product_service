import { Test, TestingModule } from '@nestjs/testing';
import { DivisonService } from './divison.service';

describe('ProductCategorysService', () => {
  let service: DivisonService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DivisonService],
    }).compile();

    service = module.get<DivisonService>(DivisonService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
