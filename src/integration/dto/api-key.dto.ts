export type ApiKeyScope = 'PO_CREATE' | 'SO_CREATE';

export class CreateApiKeyDto {
  warehouseId: number;
  scopes: ApiKeyScope[];
  createdBy: string;
}

export class ListApiKeysDto {
  warehouseId: number;
}

export class RevokeApiKeyDto {
  id: number;
  warehouseId: number;
}

export class ValidateApiKeyDto {
  apiKey: string;
  requiredScope?: ApiKeyScope;
}

export class ValidateApiKeyResult {
  valid: boolean;
  keyId?: number;
  warehouseId?: number;
  keyPrefix?: string;
  scopes?: ApiKeyScope[];
}
