export type DeliveryNoteTemplateConfig = {
  companyName: string;
  warehouseAddress: string;
  phone: string;
  footerNote: string;
  showLogo: boolean;
  showCustomer: boolean;
  showOrderCode: boolean;
  showPackageCode: boolean;
  showProductCode: boolean;
  showQuantity: boolean;
  printByDefault: boolean;
};

export const DEFAULT_DELIVERY_NOTE_TEMPLATE: DeliveryNoteTemplateConfig = {
  companyName: '',
  warehouseAddress: '',
  phone: '',
  footerNote: '',
  showLogo: true,
  showCustomer: true,
  showOrderCode: true,
  showPackageCode: true,
  showProductCode: true,
  showQuantity: true,
  printByDefault: true
};

export class UpdateDeliveryNoteTemplateDto {
  warehouseId: number;
  template: DeliveryNoteTemplateConfig;
}

export class GetDeliveryNoteTemplateDto {
  warehouseId: number;
}
