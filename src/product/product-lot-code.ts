import { PRODUCT_CODE_PATTERN } from 'src/constants/product.constants';

/**
 * New product (LOT) codes: "{warehouseId}_" + body (e.g. PROD123) so codes stay unique across warehouses.
 * Older rows without this prefix are still supported.
 */
export function stripWarehousePrefixFromProductLotCode(code: string | null | undefined): string {
  if (code == null || code === '') return '';
  const s = String(code);
  const m = s.match(/^(\d+)_(.+)$/);
  if (m) return m[2];
  return s;
}

/**
 * Stem used for LIKE / counts when splitting lots: strip optional warehouse prefix, then first "_" segment (split suffix).
 */
export function productLotCodeStemForRelatedQuery(code: string | null | undefined): string {
  const rest = stripWarehousePrefixFromProductLotCode(code);
  if (rest.includes('_')) {
    return rest.split('_')[0];
  }
  return rest;
}

export function formatNewProductLotCode(warehouseId: number, productId: number): string {
  return `${warehouseId}_${PRODUCT_CODE_PATTERN}${productId}`;
}
