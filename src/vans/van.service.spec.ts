import { Test, TestingModule } from '@nestjs/testing';
import { VanService } from './van.service';

describe('ShelfService', () => {
  let service: VanService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VanService],
    }).compile();

    service = module.get<VanService>(VanService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
