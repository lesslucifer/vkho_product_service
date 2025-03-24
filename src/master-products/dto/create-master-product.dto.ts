import { CreateProductDto } from "src/product/dto/create-product.dto";
import { MasterProductMethod } from "../enums/master-product-method";
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsBoolean, IsArray, IsEnum, MinLength, MaxLength, registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { Transform } from 'class-transformer';

function IsNonEmptyString(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isNonEmptyString',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          return value.trim().length > 0;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} cannot be empty`;
        },
      },
    });
  };
}

export class CreateMasterProductDto {
    @Transform(({ value }) => value?.trim())
    @IsNotEmpty({ message: 'Name is required' })
    @IsString()
    @IsNonEmptyString()
    @MaxLength(255)
    name: string;

    @Transform(({ value }) => value?.trim())
    @IsOptional()
    @IsString()
    @IsNonEmptyString()
    @MaxLength(50)
    code: string;

    @IsOptional()
    @IsEnum(MasterProductMethod, { 
      message: `Invalid method. Must be one of: ${Object.values(MasterProductMethod).join(', ')}` 
    })
    method: MasterProductMethod;

    @IsNotEmpty()
    @IsNumber()
    capacity: number;

    @IsOptional()
    @IsNumber()
    stogareTime: number;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    image: string;

    @IsNotEmpty()
    @IsNumber()
    warehouseId: number;

    @IsOptional()
    @IsArray()
    supplierIds: number[];

    @IsNumber()
    productCategoryId: number;

    @IsOptional()
    @IsNumber()
    purchasePrice: number;

    @IsOptional()
    @IsNumber()
    salePrice: number;

    @IsOptional()
    @IsNumber()
    retailPrice: number;

    @IsOptional()
    @IsNumber()
    VAT: number;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    DVT: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    barCode: string;

    @Transform(({ value }) => value?.trim())
    @IsNotEmpty({ message: 'Packing is required' })
    @IsString()
    @IsNonEmptyString()
    @MaxLength(255)
    packing: string;

    @IsOptional()
    @IsNumber()
    length: number;

    @IsOptional()
    @IsNumber()
    width: number;

    @IsOptional()
    @IsNumber()
    height: number;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    itemCode: string;

    @IsOptional()
    @IsBoolean()
    isActive: boolean;

    @IsOptional()
    @IsNumber()
    discount: number;

    @IsOptional()
    @IsBoolean()
    isResources: boolean;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    description: string;
}
