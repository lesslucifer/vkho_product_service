export class SuggestLocationProduct {
  productIds: number[];
}

export class SuggestLocationItem {
  productId: number;
  rackId: number;
  rack: string;
  shelf: string;
  block: string;
  zone?: string;
  availableCapacity: number;
  requiredCapacity: number;
}
