export class CreateWarehouseDto {
    name: string;
    address: string;
    acreage: number;
    userIds: string[];
    warehouseGroupId?: number;
    logoUrl?: string;
}
