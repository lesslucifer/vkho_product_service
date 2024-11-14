export interface BufferedFile {
    warehouseId: number;
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: AppMimeType;
    size: number;
    buffer: Buffer;
  }

  export type AppMimeType = 'xls' | 'xlsx';