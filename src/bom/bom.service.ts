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
      // Create and save the BOM
      const newBom = this.bomRepository.create(createBomDto);
      const savedBom = await this.bomRepository.save(newBom);

      // Create and save the BOM components
      if (createBomDto.components && createBomDto.components.length > 0) {
        // Create new components with the correct bomId
        const components = createBomDto.components.map(component => {
          return this.bomComponentRepository.create({
            ...component,
            bomId: savedBom.id
          });
        });

        // Save components in a single transaction
        await this.bomComponentRepository.save(components);
      }

      // Reload the BOM with its components
      return await this.bomRepository.findOne({
        where: { id: savedBom.id },
        relations: ['components']
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
      // Find the existing BOM
      const existingBom = await this.bomRepository.findOne({
        where: { id: updateBomDto.id },
        relations: ['components']
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

      // Handle components update if provided
      if (updateBomDto.components && updateBomDto.components.length > 0) {
        // Get existing component IDs
        const existingComponentIds = existingBom.components.map(c => c.id);
        
        // Update or create components
        const updatedComponents = await Promise.all(
          updateBomDto.components.map(async (componentDto) => {
            // Find existing component by productId
            const existingComponent = existingBom.components.find(
              c => c.productId === componentDto.productId
            );

            if (existingComponent) {
              // Update existing component
              return this.bomComponentRepository.save({
                ...existingComponent,
                ...componentDto,
                bomId: updatedBom.id
              });
            } else {
              // Create new component
              return this.bomComponentRepository.save({
                ...componentDto,
                bomId: updatedBom.id
              });
            }
          })
        );

        // Remove components that are no longer in the update DTO
        const updatedComponentIds = updatedComponents.map(c => c.id);
        const componentsToRemove = existingBom.components.filter(
          c => !updatedComponentIds.includes(c.id)
        );

        if (componentsToRemove.length > 0) {
          await this.bomComponentRepository.remove(componentsToRemove);
        }
      }

      // Reload the BOM with its components
      return await this.bomRepository.findOne({
        where: { id: updatedBom.id },
        relations: ['components']
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
      // Find the BOM with its components
      const bom = await this.bomRepository.findOne({
        where: { id },
        relations: ['components']
      });

      if (!bom) {
        throw new RpcException({
          status: 404,
          message: `BOM with ID ${id} not found`,
          error: 'Not Found'
        });
      }

      // Soft delete the BOM
      await this.bomRepository.softDelete(id);

      return {
        status: 200,
        message: `BOM with ID ${id} has been successfully soft deleted`,
        data: null
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
      // Find the BOM with its components
      const bom = await this.bomRepository
        .createQueryBuilder('bom')
        .leftJoinAndSelect('bom.components', 'components')
        .where('bom.masterProductId = :masterProductId', { masterProductId })
        .andWhere('bom.deletedAt IS NULL') // Exclude soft-deleted BOMs
        .orderBy('components.id', 'ASC') // Order components by ID
        .getOne();

      if (!bom) {
        throw new RpcException({
          status: 404,
          message: `BOM not found for master product ID: ${masterProductId}`,
          error: 'Not Found'
        });
      }

      // Get master product details
      let masterProduct;
      try {
        masterProduct = await this.masterProductsService.findOne(bom.masterProductId);
      } catch (error) {
        this.logger.warn(`Master product not found with ID: ${bom.masterProductId}`);
        masterProduct = {
          id: bom.masterProductId,
          name: 'Unknown Product',
          code: 'UNKNOWN'
        };
      }

      // Get component details
      const componentDetails = await Promise.all(
        bom.components
          .filter(component => component.bomId === bom.id) // Filter components by correct bomId
          .map(async (component) => {
            let product;
            try {
              product = await this.productService.findOne(component.productId);
            } catch (error) {
              this.logger.warn(`Component product not found with ID: ${component.productId}`);
              product = {
                id: component.productId,
                name: 'Unknown Product',
                code: 'UNKNOWN',
                totalQuantity: 0,
                supplierId: null
              };
            }

            // Log component details for debugging
            this.logger.debug(`Component details: ${JSON.stringify(component)}`);

            return {
              id: component.id,
              productId: component.productId,
              name: product.name,
              code: product.code,
              quantity: component.quantity,
              currentStock: product.totalQuantity || 0,
              status: product.status,
              supplierId: product.supplierId || null,
              unit: component.unit || null,
              color: component.color || null,
              drawers: component.drawers || null,
              notes: component.notes || null,
              createdAt: component.createdAt,
              updatedAt: component.updatedAt
            } as BomComponentDetailDto;
          })
      );

      // Remove duplicates based on productId
      const uniqueComponents = componentDetails.reduce((acc, current) => {
        const x = acc.find(item => item.productId === current.productId);
        if (!x) {
          return acc.concat([current]);
        } else {
          return acc;
        }
      }, []);

      // Construct the response
      return {
        bomId: bom.id,
        masterProductId: bom.masterProductId,
        warehouseId: bom.warehouseId,
        masterProduct: {
          id: masterProduct.id,
          name: masterProduct.name,
          code: masterProduct.code
        },
        status: bom.status,
        components: uniqueComponents,
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
        .leftJoinAndSelect('bom.components', 'components')
        .where('bom.id = :id', { id })
        .andWhere('bom.deletedAt IS NULL') // Exclude soft-deleted BOMs
        .orderBy('components.id', 'ASC') // Order components by ID
        .getOne();

      if (!bom) {
        throw new RpcException({
          status: 404,
          message: `BOM with ID ${id} not found`,
          error: 'Not Found'
        });
      }

      // Get master product details
      let masterProduct;
      try {
        masterProduct = await this.masterProductsService.findOne(bom.masterProductId);
      } catch (error) {
        this.logger.warn(`Master product not found with ID: ${bom.masterProductId}`);
        masterProduct = {
          id: bom.masterProductId,
          name: 'Unknown Product',
          code: 'UNKNOWN'
        };
      }

      // Get component details
      const componentDetails = await Promise.all(
        bom.components.map(async (component) => {
          let product;
          try {
            product = await this.productService.findOne(component.productId);
          } catch (error) {
            this.logger.warn(`Component product not found with ID: ${component.productId}`);
            product = {
              id: component.productId,
              name: 'Unknown Product',
              code: 'UNKNOWN',
              totalQuantity: 0,
              supplierId: null
            };
          }

          return {
            id: component.id,
            productId: component.productId,
            name: product.name,
            code: product.code,
            quantity: component.quantity,
            currentStock: product.totalQuantity || 0,
            status: product.status,
            supplierId: product.supplierId || null,
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
        masterProductId: bom.masterProductId,
        warehouseId: bom.warehouseId,
        masterProduct: {
          id: masterProduct.id,
          name: masterProduct.name,
          code: masterProduct.code
        },
        status: bom.status,
        components: componentDetails,
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

      // Get component details with product information
      const componentDetails = await Promise.all(
        components.map(async (component) => {
          let product;
          try {
            product = await this.productService.findOne(component.productId);
          } catch (error) {
            this.logger.warn(`Component product not found with ID: ${component.productId}`);
            product = {
              id: component.productId,
              name: 'Unknown Product',
              code: 'UNKNOWN',
              totalQuantity: 0,
              supplierId: null
            };
          }

          return {
            id: component.id,
            productId: component.productId,
            name: product.name,
            code: product.code,
            quantity: component.quantity,
            currentStock: product.totalQuantity || 0,
            status: product.status,
            supplierId: product.supplierId || null,
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
      // Find all BOMs with their components for the given warehouse
      const boms = await this.bomRepository
        .createQueryBuilder('bom')
        .leftJoinAndSelect('bom.components', 'components')
        .where('bom.warehouseId = :warehouseId', { warehouseId })
        .andWhere('bom.deletedAt IS NULL') // Exclude soft-deleted BOMs
        .orderBy('bom.id', 'ASC') // Order BOMs by ID
        .addOrderBy('components.id', 'ASC') // Order components by ID
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
          // Get master product details
          let masterProduct;
          try {
            masterProduct = await this.masterProductsService.findOne(bom.masterProductId);
          } catch (error) {
            this.logger.warn(`Master product not found with ID: ${bom.masterProductId}`);
            masterProduct = {
              id: bom.masterProductId,
              name: 'Unknown Product',
              code: 'UNKNOWN'
            };
          }

          // Get component details
          const componentDetails = await Promise.all(
            bom.components
              .filter(component => component.bomId === bom.id) // Filter components by correct bomId
              .map(async (component) => {
                let product;
                try {
                  product = await this.productService.findOne(component.productId);
                } catch (error) {
                  this.logger.warn(`Component product not found with ID: ${component.productId}`);
                  product = {
                    id: component.productId,
                    name: 'Unknown Product',
                    code: 'UNKNOWN',
                    totalQuantity: 0,
                    supplierId: null
                  };
                }

                return {
                  id: component.id,
                  productId: component.productId,
                  name: product.name,
                  code: product.code,
                  quantity: component.quantity,
                  currentStock: product.totalQuantity || 0,
                  status: product.status,
                  supplierId: product.supplierId || null,
                  unit: component.unit || null,
                  color: component.color || null,
                  drawers: component.drawers || null,
                  notes: component.notes || null,
                  createdAt: component.createdAt,
                  updatedAt: component.updatedAt
                } as BomComponentDetailDto;
              })
          );

          // Remove duplicates based on productId
          const uniqueComponents = componentDetails.reduce((acc, current) => {
            const x = acc.find(item => item.productId === current.productId);
            if (!x) {
              return acc.concat([current]);
            } else {
              return acc;
            }
          }, []);

          // Construct the response for each BOM
          return {
            bomId: bom.id,
            masterProductId: bom.masterProductId,
            warehouseId: bom.warehouseId,
            masterProduct: {
              id: masterProduct.id,
              name: masterProduct.name,
              code: masterProduct.code
            },
            status: bom.status,
            components: uniqueComponents,
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
