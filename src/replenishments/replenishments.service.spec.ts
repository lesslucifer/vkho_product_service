import { Test, TestingModule } from '@nestjs/testing';
import { ReplenishmentsService } from './replenishments.service';

describe('ReplenishmentsService', () => {
  let service: ReplenishmentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReplenishmentsService],
    }).compile();

    service = module.get<ReplenishmentsService>(ReplenishmentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
