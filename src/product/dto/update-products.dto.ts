import { IdsDTO } from "src/common/list-id.dto";
import { ProductStatus } from "../enum/product-status.enum";

export class UpdateProducts extends IdsDTO {
    status: ProductStatus;
    rackId: number;
    orderId: number;
    packageCode: string;
    group: string;
}