export const BLOCK_PATTERN = {
  BLOCK_CREATE: 'block_create',
  BLOCK_GET_ALL: 'block_get_all',
  BLOCK_GET_ONE: 'block_get_one',
  /** Shelves in a block with nested racks (same shape as shelves/get-one per shelf, as array) — used by warehouse state & reallocation. */
  BLOCK_GET_SHELVES_WITH_RACKS: 'block_get_shelves_with_racks',
  BLOCK_UPDATE: 'block_update',
  BLOCK_UPDATE_USER: 'block_update_user',
  BLOCK_ADD_USER: 'block_add_user',
  BLOCK_DELETE: 'block_delete',
};

export const BLOCK_CODE_PATTERN = "BLOC";