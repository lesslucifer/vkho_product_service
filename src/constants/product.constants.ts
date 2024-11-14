import { ProductStatus } from "src/product/enum/product-status.enum";

export const PRODUCT_PATTERN = {
  PRODUCT_CREATE: 'product_create',
  PRODUCT_GET_ALL: 'product_get_all',
  PRODUCT_GET_INVENTORY: 'product_get_inventory',
  PRODUCT_GET_ONE: 'product_get_one',
  PRODUCT_UPDATE: 'product_update',
  PRODUCT_DELETE: 'product_delete',
  PRODUCT_DELETES: 'product_deletes',
  PRODUCT_CANCEL_REALLOCATING: 'product_cancel_reallocating',
  PRODUCT_ADD_RACK: 'product_add_rack',
  PRODUCT_UPDATE_LOCATION: 'product_update_location',
  PRODUCT_SCAN: 'product_scan',
  PRODUCT_SPLIT: 'product_split',
  PRODUCT_UPDATES: 'product_updates',
  PRODUCT_RECOMMEND: 'product_recommend',
  PRODUCT_CREATE_EXCEL: 'product_create_excel',
};

export const INCREMENT: string = "increment";
export const DECREMENT: string = "decrement";

export const PRODUCT_CODE_PATTERN = "PROD";
export const STATUS_UPDATE_CAPACITY_ARRAY = [ProductStatus.STORED, ProductStatus.MOVING, ProductStatus.TEMPORARY];
