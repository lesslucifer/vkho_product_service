import { ConfirmProduct } from "./confirm-product.dto";

export class ConfirmReceipt {
    id: number;
    zoneId: number;
    products: ConfirmProduct[];
}