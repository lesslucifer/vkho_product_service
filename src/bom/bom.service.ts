import { HttpService } from '@nestjs/axios';
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError } from 'typeorm';
import { CreateBomDto } from './dto/create-bom.dto';
import { Bom } from './entities/bom.entity';
import { BomComponent } from 'src/bom-component/entities/bom-component.entity';
import { UpdateBomDto } from './dto/update-bom.dto';
import { BomDetailDto, BomComponentDetailDto } from './dto/bom-detail.dto';
import { ProductService } from 'src/product/product.service';
import { SuppliersService } from 'src/suppliers/suppliers.service';
import { ProductCategorysService } from 'src/product-categorys/product-categorys.service';
import { ReplenishmentsService } from 'src/replenishments/replenishments.service';
import { MasterProductsService } from 'src/master-products/master-products.service';
import { ResponseDTO } from 'src/common/response.dto';
import { BomStatus } from './enum/bom-status.enum';

@Injectable()
export class BomService {
  private readonly logger = new Logger(BomService.name);

  constructor(
    @InjectRepository(Bom)
    private bomRepository: Repository<Bom>,

    @InjectRepository(BomComponent)
    private bomComponentRepository: Repository<BomComponent>,

    @Inject(forwardRef(() => ProductService))
    private readonly productService: ProductService,
    @Inject(forwardRef(() => SuppliersService))
    private readonly suppliersService: SuppliersService,
    @Inject(forwardRef(() => ProductCategorysService))
    private readonly productCategorysService: ProductCategorysService,
    @Inject(forwardRef(() => ReplenishmentsService))
    private readonly replenishmentsService: ReplenishmentsService,
    @Inject(forwardRef(() => MasterProductsService))
    private readonly masterProductsService: MasterProductsService,
    private configService: ConfigService,
    private httpService: HttpService,
  ) {}

  async create(createBomDto: CreateBomDto) {
    this.logger.log(`Request to save BOM`);
    
    try {
      // Validate and transform status
      if (createBomDto.status) {
        const validStatus = Object.values(BomStatus).includes(createBomDto.status as BomStatus);
        if (!validStatus) {
          throw new RpcException({
            status: 400,
            message: `Invalid status value. Must be one of: ${Object.values(BomStatus).join(', ')}`,
            error: 'Bad Request'
          });
        }
      }

      // Create and save the BOM
      const newBom = this.bomRepository.create({
        warehouse: { id: createBomDto.warehouseId },
        status: createBomDto.status || BomStatus.ACTIVE
      });
      const savedBom = await this.bomRepository.save(newBom);

      // Create and save the BOM components
      if (createBomDto.bomComponents && createBomDto.bomComponents.length > 0) {
        // Create new components with the correct bomId
        const bomComponents = createBomDto.bomComponents.map(component => {
          return this.bomComponentRepository.create({
            masterProduct: { id: component.masterProductId },
            quantity: component.quantity,
            unit: component.unit,
            color: component.color,
            drawers: component.drawers,
            notes: component.notes,
            bom: savedBom
          });
        });

        // Save components in a single transaction
        await this.bomComponentRepository.save(bomComponents);
      }

      // Reload the BOM with its components
      return await this.bomRepository.findOne({
        where: { id: savedBom.id },
        relations: ['bomComponents', 'warehouse']
      });
    } catch (error) {
      if (error instanceof QueryFailedError) {
        // Handle specific database constraint violations
        if (error.message.includes('violates not-null constraint')) {
          const column = error.message.match(/column "(\w+)"/)?.[1];
          throw new RpcException({
            status: 400,
            message: `The field '${column}' is required and cannot be null`,
            error: 'Bad Request'
          });
        }
      }
      // For other errors, throw a generic error
      throw new RpcException({
        status: 500,
        message: error.message || 'An error occurred while creating the BOM',
        error: 'Internal Server Error'
      });
    }
  }

  async update(updateBomDto: UpdateBomDto) {
    this.logger.log(`Request to update BOM with ID: ${updateBomDto.id}`);
    
    try {
      // Validate and transform status
      if (updateBomDto.status) {
        const validStatus = Object.values(BomStatus).includes(updateBomDto.status as BomStatus);
        if (!validStatus) {
          throw new RpcException({
            status: 400,
            message: `Invalid status value. Must be one of: ${Object.values(BomStatus).join(', ')}`,
            error: 'Bad Request'
          });
        }
      }

      // Find the existing BOM
      const existingBom = await this.bomRepository.findOne({
        where: { id: updateBomDto.id },
        relations: ['bomComponents', 'warehouse']
      });

      if (!existingBom) {
        throw new RpcException({
          status: 404,
          message: `BOM with ID ${updateBomDto.id} not found`,
          error: 'Not Found'
        });
      }

      // Update BOM properties
      if (updateBomDto.status) {
        existingBom.status = updateBomDto.status;
      }

      // Save the updated BOM
      const updatedBom = await this.bomRepository.save(existingBom);

      // Handle components update
      if (updateBomDto.bomComponents && updateBomDto.bomComponents.length > 0) {
        // Update or create components
        for (const componentDto of updateBomDto.bomComponents) {
          const existingComponent = existingBom.bomComponents.find(
            c => c.id === parseInt(componentDto.id.toString())
          );

          if (existingComponent) {
            // Update existing component
            existingComponent.masterProduct = { id: componentDto.masterProductId } as any;
            existingComponent.quantity = parseFloat(componentDto.quantity.toString());
            existingComponent.unit = componentDto.unit;
            existingComponent.color = componentDto.color;
            existingComponent.drawers = componentDto.drawers;
            existingComponent.notes = componentDto.notes;
            await this.bomComponentRepository.save(existingComponent);
          } else {
            // Create new component if it doesn't exist
            const newComponent = this.bomComponentRepository.create({
              masterProduct: { id: componentDto.masterProductId },
              quantity: parseFloat(componentDto.quantity.toString()),
              unit: componentDto.unit,
              color: componentDto.color,
              drawers: componentDto.drawers,
              notes: componentDto.notes,
              bom: updatedBom
            });
            await this.bomComponentRepository.save(newComponent);
          }
        }
      }

      // Reload the BOM with its components and warehouse
      return await this.bomRepository.findOne({
        where: { id: updatedBom.id },
        relations: ['bomComponents', 'warehouse']
      });
    } catch (error) {
      if (error instanceof QueryFailedError) {
        // Handle specific database constraint violations
        if (error.message.includes('violates not-null constraint')) {
          const column = error.message.match(/column "(\w+)"/)?.[1];
          throw new RpcException({
            status: 400,
            message: `The field '${column}' is required and cannot be null`,
            error: 'Bad Request'
          });
        }
      }
      // For other errors, throw a generic error
      throw new RpcException({
        status: 500,
        message: error.message || 'An error occurred while updating the BOM',
        error: 'Internal Server Error'
      });
    }
  }

  async remove(id: number) {
    this.logger.log(`Request to soft delete BOM with ID: ${id}`);
    
    try {
      // Find the BOM with its components and warehouse
      const bom = await this.bomRepository.findOne({
        where: { id },
        relations: ['bomComponents', 'warehouse']
      });

      if (!bom) {
        throw new RpcException({
          status: 404,
          message: `BOM with ID ${id} not found`,
          error: 'Not Found'
        });
      }

      // Soft delete the BOM components first
      if (bom.bomComponents && bom.bomComponents.length > 0) {
        await Promise.all(
          bom.bomComponents.map(component => 
            this.bomComponentRepository.softDelete(component.id)
          )
        );
      }

      // Update BOM status to INACTIVE and soft delete
      await this.bomRepository.update(id, {
        status: BomStatus.INACTIVE,
        deletedAt: new Date()
      });

      // Get the deleted BOM details for response
      const deletedBom = {
        id: bom.id,
        status: BomStatus.INACTIVE,
        createdAt: bom.createdAt,
        updatedAt: bom.updatedAt,
        deletedAt: new Date(),
        bomComponents: bom.bomComponents.map(component => ({
          id: component.id,
          bomId: component.bomId,
          masterProductId: component.masterProductId,
          quantity: component.quantity,
          unit: component.unit,
          color: component.color,
          drawers: component.drawers,
          notes: component.notes,
          createdAt: component.createdAt,
          updatedAt: component.updatedAt,
          deletedAt: new Date()
        })),
        warehouse: bom.warehouse
      };

      return {
        status: 200,
        message: `BOM with ID ${id} has been successfully soft deleted and disabled`,
        data: deletedBom
      };
    } catch (error) {
      if (error instanceof QueryFailedError) {
        // Handle specific database constraint violations
        if (error.message.includes('violates foreign key constraint')) {
          throw new RpcException({
            status: 400,
            message: 'Cannot delete BOM as it is referenced by other records',
            error: 'Bad Request'
          });
        }
      }
      // For other errors, throw a generic error
      throw new RpcException({
        status: 500,
        message: error.message || 'An error occurred while soft deleting the BOM',
        error: 'Internal Server Error'
      });
    }
  }

  async getByMasterProductId(masterProductId: number): Promise<BomDetailDto> {
    this.logger.log(`Request to get BOM for master product ID: ${masterProductId}`);
    
    try {
      // Find the BOM with its components and warehouse
      const bom = await this.bomRepository
        .createQueryBuilder('bom')
        .leftJoinAndSelect('bom.bomComponents', 'bomComponents')
        .leftJoinAndSelect('bom.warehouse', 'warehouse')
        .where('bom.masterProductId = :masterProductId', { masterProductId })
        .andWhere('bom.deletedAt IS NULL') // Exclude soft-deleted BOMs
        .orderBy('bomComponents.id', 'ASC') // Order components by ID
        .getOne();

      if (!bom) {
        throw new RpcException({
          status: 404,
          message: `BOM not found for master product ID: ${masterProductId}`,
          error: 'Not Found'
        });
      }

      // Get component details with master product information
      const componentDetails = await Promise.all(
        bom.bomComponents
          .filter(component => component.bomId === bom.id) // Filter components by correct bomId
          .map(async (component) => {
            let masterProduct;
            try {
              masterProduct = await this.masterProductsService.findOne(component.masterProductId);
            } catch (error) {
              this.logger.warn(`Master product not found with ID: ${component.masterProductId}`);
              masterProduct = {
                id: component.masterProductId,
                name: 'Unknown Product',
                code: 'UNKNOWN',
                availableQuantity: 0,
                status: null
              };
            }

            return {
              id: component.id,
              masterProductId: component.masterProductId,
              name: masterProduct.name,
              code: masterProduct.code,
              quantity: component.quantity,
              currentStock: masterProduct.availableQuantity || 0,
              status: masterProduct.status,
              unit: component.unit || null,
              color: component.color || null,
              drawers: component.drawers || null,
              notes: component.notes || null,
              createdAt: component.createdAt,
              updatedAt: component.updatedAt
            } as BomComponentDetailDto;
          })
      );

      // Remove duplicates based on masterProductId
      const uniqueComponents = componentDetails.reduce((acc, current) => {
        const x = acc.find(item => item.masterProductId === current.masterProductId);
        if (!x) {
          return acc.concat([current]);
        } else {
          return acc;
        }
      }, []);

      // Construct the response
      return {
        bomId: bom.id,
        warehouseId: bom.warehouse?.id,
        status: bom.status,
        bomComponents: uniqueComponents,
        createdAt: bom.createdAt,
        updatedAt: bom.updatedAt,
        deletedAt: bom.deletedAt
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        status: 500,
        message: error.message || 'An error occurred while fetching BOM details',
        error: 'Internal Server Error'
      });
    }
  }

  async getOne(id: number): Promise<BomDetailDto> {
    this.logger.log(`Request to get BOM with ID: ${id}`);
    
    try {
      // Find the BOM with its components
      const bom = await this.bomRepository
        .createQueryBuilder('bom')
        .leftJoinAndSelect('bom.bomComponents', 'bomComponents')
        .where('bom.id = :id', { id })
        .andWhere('bom.deletedAt IS NULL') // Exclude soft-deleted BOMs
        .orderBy('bomComponents.id', 'ASC') // Order components by ID
        .getOne();

      if (!bom) {
        throw new RpcException({
          status: 404,
          message: `BOM with ID ${id} not found`,
          error: 'Not Found'
        });
      }

      // Get component details with master product information
      const componentDetails = await Promise.all(
        bom.bomComponents.map(async (component) => {
          let masterProduct;
          try {
            masterProduct = await this.masterProductsService.findOne(component.masterProductId);
          } catch (error) {
            this.logger.warn(`Master product not found with ID: ${component.masterProductId}`);
            masterProduct = {
              id: component.masterProductId,
              name: 'Unknown Product',
              code: 'UNKNOWN',
              availableQuantity: 0,
              status: null
            };
          }

          return {
            id: component.id,
            masterProductId: component.masterProductId,
            name: masterProduct.name,
            code: masterProduct.code,
            quantity: component.quantity,
            currentStock: masterProduct.availableQuantity || 0,
            status: masterProduct.status,
            unit: component.unit || null,
            color: component.color || null,
            drawers: component.drawers || null,
            notes: component.notes || null,
            createdAt: component.createdAt,
            updatedAt: component.updatedAt
          } as BomComponentDetailDto;
        })
      );

      // Construct the response
      return {
        bomId: bom.id,
        warehouseId: bom.warehouse?.id,
        status: bom.status,
        bomComponents: componentDetails,
        createdAt: bom.createdAt,
        updatedAt: bom.updatedAt,
        deletedAt: bom.deletedAt
      };
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        status: 500,
        message: error.message || 'An error occurred while fetching BOM details',
        error: 'Internal Server Error'
      });
    }
  }

  async getAllComponents(page: number = 1, limit: number = 10): Promise<ResponseDTO> {
    this.logger.log(`Request to get all BOM components with pagination - page: ${page}, limit: ${limit}`);
    
    try {
      // Calculate skip and take
      const skip = (page - 1) * limit;
      
      // Get total count
      const total = await this.bomComponentRepository.count();
      
      // Get paginated components
      const components = await this.bomComponentRepository.find({
        order: {
          id: 'ASC'
        },
        skip,
        take: limit
      });

      // Get component details with master product information
      const componentDetails = await Promise.all(
        components.map(async (component) => {
          let masterProduct;
          try {
            masterProduct = await this.masterProductsService.findOne(component.masterProductId);
          } catch (error) {
            this.logger.warn(`Master product not found with ID: ${component.masterProductId}`);
            masterProduct = {
              id: component.masterProductId,
              name: 'Unknown Product',
              code: 'UNKNOWN',
              availableQuantity: 0,
              status: null
            };
          }

          return {
            id: component.id,
            masterProductId: component.masterProductId,
            name: masterProduct.name,
            code: masterProduct.code,
            quantity: component.quantity,
            currentStock: masterProduct.availableQuantity || 0,
            status: masterProduct.status,
            unit: component.unit || null,
            color: component.color || null,
            drawers: component.drawers || null,
            notes: component.notes || null,
            createdAt: component.createdAt,
            updatedAt: component.updatedAt
          } as BomComponentDetailDto;
        })
      );

      const response = new ResponseDTO();
      response.data = componentDetails;
      response.totalItem = total;
      return response;
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        status: 500,
        message: error.message || 'An error occurred while fetching BOM components',
        error: 'Internal Server Error'
      });
    }
  }

  async getByWarehouseId(warehouseId: number): Promise<BomDetailDto[]> {
    this.logger.log(`Request to get BOMs for warehouse ID: ${warehouseId}`);
    
    try {
      // Find all BOMs with their components and warehouse for the given warehouse
      const boms = await this.bomRepository
        .createQueryBuilder('bom')
        .leftJoinAndSelect('bom.bomComponents', 'bomComponents')
        .leftJoinAndSelect('bom.warehouse', 'warehouse')
        .where('bom.warehouseId = :warehouseId', { warehouseId })
        .andWhere('bom.deletedAt IS NULL') // Exclude soft-deleted BOMs
        .orderBy('bom.id', 'ASC') // Order BOMs by ID
        .addOrderBy('bomComponents.id', 'ASC') // Order components by ID
        .getMany();

      if (!boms || boms.length === 0) {
        throw new RpcException({
          status: 404,
          message: `No BOMs found for warehouse ID: ${warehouseId}`,
          error: 'Not Found'
        });
      }

      // Process each BOM to get full details
      const bomDetails = await Promise.all(
        boms.map(async (bom) => {
          // Get component details with master product information
          const componentDetails = await Promise.all(
            bom.bomComponents
              .filter(component => component.bomId === bom.id) // Filter components by correct bomId
              .map(async (component) => {
                let masterProduct;
                try {
                  masterProduct = await this.masterProductsService.findOne(component.masterProductId);
                } catch (error) {
                  this.logger.warn(`Master product not found with ID: ${component.masterProductId}`);
                  masterProduct = {
                    id: component.masterProductId,
                    name: 'Unknown Product',
                    code: 'UNKNOWN',
                    availableQuantity: 0,
                    status: null
                  };
                }

                return {
                  id: component.id,
                  masterProductId: component.masterProductId,
                  name: masterProduct.name,
                  code: masterProduct.code,
                  quantity: component.quantity,
                  currentStock: masterProduct.availableQuantity || 0,
                  status: masterProduct.status,
                  unit: component.unit || null,
                  color: component.color || null,
                  drawers: component.drawers || null,
                  notes: component.notes || null,
                  createdAt: component.createdAt,
                  updatedAt: component.updatedAt
                } as BomComponentDetailDto;
              })
          );

          // Remove duplicates based on masterProductId
          const uniqueComponents = componentDetails.reduce((acc, current) => {
            const x = acc.find(item => item.masterProductId === current.masterProductId);
            if (!x) {
              return acc.concat([current]);
            } else {
              return acc;
            }
          }, []);

          // Construct the response for each BOM
          return {
            bomId: bom.id,
            warehouseId: bom.warehouse?.id,
            status: bom.status,
            bomComponents: uniqueComponents,
            createdAt: bom.createdAt,
            updatedAt: bom.updatedAt,
            deletedAt: bom.deletedAt
          } as BomDetailDto;
        })
      );

      return bomDetails;
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        status: 500,
        message: error.message || 'An error occurred while fetching BOM details by warehouse',
        error: 'Internal Server Error'
      });
    }
  }
}