import { Block } from "src/blocks/entities/block.entity";
import { ParentProductCategory } from "src/parent-product-categorys/entities/parent-product-category.entity";
import { ProductCategory } from "src/product-categorys/entities/product-category.entity";
import { RackDTO } from "src/racks/dto/response-rack.dto";

export class ShelfDTO {
    id: number;
    code: string;
    name: string;
    position: number;
    totalRack: number;
    available: number;
    medium: number;
    high: number;
    capacity: number;
    status: string;
    warehouseId: number;
    createDate: Date;
    block: Block;
    parentProductCategory: ParentProductCategory;
    racks: RackDTO[]
}