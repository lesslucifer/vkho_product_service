import { Test, TestingModule } from '@nestjs/testing';
import { ShelfService } from './shelf.service';

describe('ShelfService', () => {
  let service: ShelfService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ShelfService],
    }).compile();

    service = module.get<ShelfService>(ShelfService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
