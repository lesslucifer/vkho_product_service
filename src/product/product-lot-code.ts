import { PRODUCT_CODE_PATTERN, PRODUCT_LOT_CODE_PREFIX } from 'src/constants/product.constants';

const LOT_BODY_PREFIXES_ALT = `${PRODUCT_LOT_CODE_PREFIX}|${PRODUCT_CODE_PATTERN}`;

export function stripWarehousePrefixFromProductLotCode(code: string | null | undefined): string {
  if (code == null || code === '') return '';
  const s = String(code);
  const m = s.match(/^(\d+)_(.+)$/);
  if (m) return m[2];
  return s;
}

export function productLotCodeStemForRelatedQuery(code: string | null | undefined): string {
  const rest = stripWarehousePrefixFromProductLotCode(code);
  if (rest.includes('_')) {
    return rest.split('_')[0];
  }
  return rest;
}

export function formatNewProductLotCode(warehouseId: number, productId: number): string {
  return `${warehouseId}_${PRODUCT_LOT_CODE_PREFIX}${productId}`;
}

export function keywordMatchesProductCodeExactLookup(keyword: string): boolean {
  if (keyword == null || keyword === '') return false;
  if (keyword.startsWith(PRODUCT_LOT_CODE_PREFIX) || keyword.startsWith(PRODUCT_CODE_PATTERN)) {
    return true;
  }
  return new RegExp(`^\\d+_(?:${LOT_BODY_PREFIXES_ALT})`).test(keyword);
}
