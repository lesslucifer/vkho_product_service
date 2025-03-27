import { RpcException } from '@nestjs/microservices';
import * as moment from 'moment';

interface StringFieldValidation {
  field: string;
  message: string;
  required?: boolean;
}

interface NumericFieldValidation {
  field: string;
  min?: number;
  max?: number;
  message: string;
  required?: boolean;
}

interface EnumFieldValidation {
  field: string;
  enum: any;
  message: string;
  required?: boolean;
}

interface DateFieldValidation {
  field: string;
  message?: string;
  required?: boolean;
  format?: string;
}

export class InputValidator {
  private static instance: InputValidator;
  private constructor() {}

  public static getInstance(): InputValidator {
    if (!InputValidator.instance) {
      InputValidator.instance = new InputValidator();
    }
    return InputValidator.instance;
  }

  validateStringFields(data: any, validations: StringFieldValidation[]) {
    validations.forEach(({ field, message, required = false }) => {
      if (required && !data[field]) {
        throw new RpcException({
          status: 400,
          message: `${field} is required`,
          error: 'Bad Request'
        });
      }

      if (data[field] && data[field].trim() === '') {
        throw new RpcException({
          status: 400,
          message,
          error: 'Bad Request'
        });
      }
    });
  }

  validateNumericFields(data: any, validations: NumericFieldValidation[]) {
    validations.forEach(({ field, min, max, message, required = false }) => {
      if (required && data[field] === undefined) {
        throw new RpcException({
          status: 400,
          message: `${field} is required`,
          error: 'Bad Request'
        });
      }

      if (data[field] !== undefined) {
        if (min !== undefined && data[field] < min) {
          throw new RpcException({
            status: 400,
            message,
            error: 'Bad Request'
          });
        }

        if (max !== undefined && data[field] > max) {
          throw new RpcException({
            status: 400,
            message: `${field} cannot be greater than ${max}`,
            error: 'Bad Request'
          });
        }
      }
    });
  }

  validateEnumFields(data: any, validations: EnumFieldValidation[]) {
    validations.forEach(({ field, enum: enumValues, message, required = false }) => {
      if (required && !data[field]) {
        throw new RpcException({
          status: 400,
          message: `${field} is required`,
          error: 'Bad Request'
        });
      }

      if (data[field] && !Object.values(enumValues).includes(data[field])) {
        throw new RpcException({
          status: 400,
          message: `Invalid ${field}. Must be one of: ${Object.values(enumValues).join(', ')}`,
          error: 'Bad Request'
        });
      }
    });
  }

  validateDateFields(data: any, validations: DateFieldValidation[]) {
    validations.forEach(({ field, message, required = false, format = 'YYYY-MM-DD HH:mm:ss' }) => {
      if (required && !data[field]) {
        throw new RpcException({
          status: 400,
          message: `${field} is required`,
          error: 'Bad Request'
        });
      }

      if (data[field]) {
        const date = moment(data[field], format);
        if (!date.isValid()) {
          throw new RpcException({
            status: 400,
            message: message || `Invalid date format for ${field}. Expected format: ${format}`,
            error: 'Bad Request'
          });
        }
      }
    });
  }

  trimStringFields(data: any, fields: string[]) {
    fields.forEach(field => {
      if (data[field]) {
        data[field] = data[field].trim();
      }
    });
  }
} 