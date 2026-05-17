export class RecommendBatchItem {
  masterProductId: number;
  quantity?: number;
}

export class RecommendBatchRequest {
  warehouseId: number;
  items: RecommendBatchItem[];
}

export class RecommendBatchSuggestion {
  zone: string;
  block: string;
  shelf: string;
  rack: string;
  availableQuantity: number;
  productId: number;
  storageDate?: Date;
  expireDate?: Date;
}

export class RecommendBatchEntry {
  masterProductId: number;
  totalAvailable: number;
  requestedQuantity?: number;
  suggestedLocations: RecommendBatchSuggestion[];
}

export class RecommendBatchResponse {
  warehouseId: number;
  results: RecommendBatchEntry[];
}
