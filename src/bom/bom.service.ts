import { HttpService } from '@nestjs/axios';
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryFailedError, In, Not } from 'typeorm';
import { CreateBomDto } from './dto/create-bom.dto';
import { Bom } from './entities/bom.entity';
import { BomComponent } from 'src/bom-component/entities/bom-component.entity';
import { BomFinishedProduct } from 'src/bom-finished-product/entities/bom-finished-product.entity';
import { Product } from 'src/product/entities/product.entity';
import { Crafting } from './entities/crafting.entity';
import { UpdateBomDto } from './dto/update-bom.dto';
import { BomDetailDto, BomComponentDetailDto } from './dto/bom-detail.dto';
import { CraftFinishedProductDto } from './dto/craft-finished-product.dto';
import { CreateCraftingDto } from './dto/create-crafting.dto';
import { UpdateCraftingDto } from './dto/update-crafting.dto';
import { ProductService } from 'src/product/product.service';
import { SuppliersService } from 'src/suppliers/suppliers.service';
import { ProductCategorysService } from 'src/product-categorys/product-categorys.service';
import { ReplenishmentsService } from 'src/replenishments/replenishments.service';
import { MasterProductsService } from 'src/master-products/master-products.service';
import { ResponseDTO } from 'src/common/response.dto';
import { BomStatus } from './enum/bom-status.enum';
import { ProductStatus } from 'src/product/enum/product-status.enum';
import { CraftingStatus } from './enums/crafting-status.enum';
import { UpsertCraftingDto } from './dto/upsert-crafting.dto';
import { ReceiptsService } from 'src/receipts/receipts.service';
import { CreateReceiptDto } from 'src/receipts/dto/create-receipt.dto';


@Injectable()
export class BomService {
  private readonly logger = new Logger(BomService.name);

  constructor(
    @InjectRepository(Bom)
    private bomRepository: Repository<Bom>,

    @InjectRepository(BomComponent)
    private bomComponentRepository: Repository<BomComponent>,

    @InjectRepository(BomFinishedProduct)
    private bomFinishedProductRepository: Repository<BomFinishedProduct>,

    @InjectRepository(Product)
    private productRepository: Repository<Product>,

    @InjectRepository(Crafting)
    private craftingRepository: Repository<Crafting>,

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
    @Inject(forwardRef(() => ReceiptsService))
    private readonly receiptsService: ReceiptsService,
    private configService: ConfigService,
    private httpService: HttpService,
  ) { }

  async create(createBomDto: CreateBomDto) {
    this.logger.log(`Request to save BOM`);

    try {
      // Validate that bomFinishedProduct is provided
      if (!createBomDto.bomFinishedProduct) {
        throw new RpcException({
          status: 400,
          message: 'The finished product is required',
          error: 'Bad Request'
        });
      }

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
        name: createBomDto.name,
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

      // Create and save the BOM finished product if provided
      if (createBomDto.bomFinishedProduct) {
        const newBomFinishedProduct = this.bomFinishedProductRepository.create({
          bomId: savedBom.id,
          masterProductId: createBomDto.bomFinishedProduct.masterProductId,
          quantity: createBomDto.bomFinishedProduct.quantity,
          color: createBomDto.bomFinishedProduct.color,
          drawers: createBomDto.bomFinishedProduct.drawers,
          notes: createBomDto.bomFinishedProduct.notes
        });

        await this.bomFinishedProductRepository.save(newBomFinishedProduct);
      }

      // Reload the BOM with its components, finished product, and warehouse
      const savedBomWithDetails = await this.bomRepository.findOne({
        where: { id: savedBom.id },
        relations: ['bomComponents', 'bomFinishedProduct', 'warehouse']
      });

      // Get finished product details if exists
      let finishedProductDetails = null;
      if (savedBomWithDetails.bomFinishedProduct) {
        let masterProduct;
        try {
          masterProduct = await this.masterProductsService.findOne(savedBomWithDetails.bomFinishedProduct.masterProductId);
        } catch (error) {
          this.logger.warn(`Master product not found with ID: ${savedBomWithDetails.bomFinishedProduct.masterProductId}`);
          masterProduct = {
            id: savedBomWithDetails.bomFinishedProduct.masterProductId,
            name: 'Unknown Product',
            code: 'UNKNOWN',
            availableQuantity: 0,
            status: null
          };
        }

        finishedProductDetails = {
          id: savedBomWithDetails.bomFinishedProduct.id,
          bomId: savedBomWithDetails.bomFinishedProduct.bomId,
          masterProductId: savedBomWithDetails.bomFinishedProduct.masterProductId,
          productName: masterProduct.name,
          productCode: masterProduct.code,
          quantity: savedBomWithDetails.bomFinishedProduct.quantity,
          color: savedBomWithDetails.bomFinishedProduct.color || null,
          drawers: savedBomWithDetails.bomFinishedProduct.drawers || null,
          notes: savedBomWithDetails.bomFinishedProduct.notes || null,
          createdAt: savedBomWithDetails.bomFinishedProduct.createdAt,
          updatedAt: savedBomWithDetails.bomFinishedProduct.updatedAt
        };
      }

      // Transform the response to match the desired format
      return {
        bomId: savedBomWithDetails.id,
        name: savedBomWithDetails.name,
        status: savedBomWithDetails.status,
        createdAt: savedBomWithDetails.createdAt,
        updatedAt: savedBomWithDetails.updatedAt,
        deletedAt: savedBomWithDetails.deletedAt,
        bomComponents: savedBomWithDetails.bomComponents,
        bomFinishedProduct: finishedProductDetails,
        warehouse: savedBomWithDetails.warehouse
      };
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
    this.logger.log(`Request to update BOM with ID: ${updateBomDto.bomId}`);

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
        where: { id: updateBomDto.bomId },
        relations: ['bomComponents', 'bomFinishedProduct', 'warehouse']
      });

      if (!existingBom) {
        throw new RpcException({
          status: 400,
          message: `BOM with ID ${updateBomDto.bomId} not found`,
          error: 'Not Found'
        });
      }

      // Update BOM properties
      if (updateBomDto.name) {
        existingBom.name = updateBomDto.name;
      }
      if (updateBomDto.status) {
        existingBom.status = updateBomDto.status;
      }

      // Save the updated BOM
      const updatedBom = await this.bomRepository.save(existingBom);

      // Handle components update
      // Get IDs of components in the request (empty array if no components provided)
      const requestComponentIds = updateBomDto.bomComponents
        ?.filter(c => c.id) // Only include components that have an ID
        .map(c => parseInt(c.id.toString())) || [];

      // Find components to delete (exist in DB but not in request)
      const componentsToDelete = existingBom.bomComponents.filter(
        c => !requestComponentIds.includes(c.id)
      );

      // Delete components that are no longer in the request
      if (componentsToDelete.length > 0) {
        await Promise.all(
          componentsToDelete.map(component =>
            this.bomComponentRepository.softDelete(component.id)
          )
        );
      }

      // Update or create components if any are provided
      if (updateBomDto.bomComponents && updateBomDto.bomComponents.length > 0) {
        // Update or create components
        for (const componentDto of updateBomDto.bomComponents) {
          if (componentDto.id) {
            // Update existing component
            const existingComponent = existingBom.bomComponents.find(
              c => c.id === parseInt(componentDto.id.toString())
            );

            if (existingComponent) {
              existingComponent.masterProduct = { id: componentDto.masterProductId } as any;
              existingComponent.quantity = Number(componentDto.quantity);
              existingComponent.unit = componentDto.unit;
              existingComponent.color = componentDto.color;
              existingComponent.drawers = componentDto.drawers;
              existingComponent.notes = componentDto.notes;
              await this.bomComponentRepository.save(existingComponent);
            }
          } else {
            // Create new component if it doesn't exist
            const newComponent = this.bomComponentRepository.create({
              masterProduct: { id: componentDto.masterProductId },
              quantity: Number(componentDto.quantity),
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

      // Handle finished product update
      if (updateBomDto.bomFinishedProduct) {
        if (existingBom.bomFinishedProduct) {
          // Update existing finished product
          existingBom.bomFinishedProduct.masterProductId = updateBomDto.bomFinishedProduct.masterProductId;
          existingBom.bomFinishedProduct.quantity = Number(updateBomDto.bomFinishedProduct.quantity);
          existingBom.bomFinishedProduct.color = updateBomDto.bomFinishedProduct.color;
          existingBom.bomFinishedProduct.drawers = updateBomDto.bomFinishedProduct.drawers;
          existingBom.bomFinishedProduct.notes = updateBomDto.bomFinishedProduct.notes;
          await this.bomFinishedProductRepository.save(existingBom.bomFinishedProduct);
        } else {
          // Create new finished product
          const newBomFinishedProduct = this.bomFinishedProductRepository.create({
            bomId: updatedBom.id,
            masterProductId: updateBomDto.bomFinishedProduct.masterProductId,
            quantity: Number(updateBomDto.bomFinishedProduct.quantity),
            color: updateBomDto.bomFinishedProduct.color,
            drawers: updateBomDto.bomFinishedProduct.drawers,
            notes: updateBomDto.bomFinishedProduct.notes
          });
          await this.bomFinishedProductRepository.save(newBomFinishedProduct);
        }
      }

      // Reload the BOM with its components, finished product, and warehouse
      const updatedBomWithDetails = await this.bomRepository.findOne({
        where: { id: updatedBom.id },
        relations: ['bomComponents', 'bomFinishedProduct', 'warehouse']
      });

      // Get finished product details if exists
      let finishedProductDetails = null;
      if (updatedBomWithDetails.bomFinishedProduct) {
        let masterProduct;
        try {
          masterProduct = await this.masterProductsService.findOne(updatedBomWithDetails.bomFinishedProduct.masterProductId);
        } catch (error) {
          this.logger.warn(`Master product not found with ID: ${updatedBomWithDetails.bomFinishedProduct.masterProductId}`);
          masterProduct = {
            id: updatedBomWithDetails.bomFinishedProduct.masterProductId,
            name: 'Unknown Product',
            code: 'UNKNOWN',
            availableQuantity: 0,
            status: null
          };
        }

        finishedProductDetails = {
          id: updatedBomWithDetails.bomFinishedProduct.id,
          bomId: updatedBomWithDetails.bomFinishedProduct.bomId,
          masterProductId: updatedBomWithDetails.bomFinishedProduct.masterProductId,
          productName: masterProduct.name,
          productCode: masterProduct.code,
          quantity: updatedBomWithDetails.bomFinishedProduct.quantity,
          color: updatedBomWithDetails.bomFinishedProduct.color || null,
          drawers: updatedBomWithDetails.bomFinishedProduct.drawers || null,
          notes: updatedBomWithDetails.bomFinishedProduct.notes || null,
          createdAt: updatedBomWithDetails.bomFinishedProduct.createdAt,
          updatedAt: updatedBomWithDetails.bomFinishedProduct.updatedAt
        };
      }

      // Transform the response to match the desired format
      return {
        bomId: updatedBomWithDetails.id,
        name: updatedBomWithDetails.name,
        status: updatedBomWithDetails.status,
        createdAt: updatedBomWithDetails.createdAt,
        updatedAt: updatedBomWithDetails.updatedAt,
        deletedAt: updatedBomWithDetails.deletedAt,
        bomComponents: updatedBomWithDetails.bomComponents,
        bomFinishedProduct: finishedProductDetails,
        warehouse: updatedBomWithDetails.warehouse
      };
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
      // Find the BOM with its components, finished product, and warehouse
      const bom = await this.bomRepository.findOne({
        where: { id },
        relations: ['bomComponents', 'bomFinishedProduct', 'warehouse']
      });

      if (!bom) {
        throw new RpcException({
          status: 400,
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

      // Soft delete the BOM finished product if exists
      if (bom.bomFinishedProduct) {
        await this.bomFinishedProductRepository.softDelete(bom.bomFinishedProduct.id);
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
        bomFinishedProduct: bom.bomFinishedProduct ? {
          id: bom.bomFinishedProduct.id,
          bomId: bom.bomFinishedProduct.bomId,
          masterProductId: bom.bomFinishedProduct.masterProductId,
          quantity: bom.bomFinishedProduct.quantity,
          color: bom.bomFinishedProduct.color,
          drawers: bom.bomFinishedProduct.drawers,
          notes: bom.bomFinishedProduct.notes,
          createdAt: bom.bomFinishedProduct.createdAt,
          updatedAt: bom.bomFinishedProduct.updatedAt,
          deletedAt: new Date()
        } : null,
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
      // Find the BOM with its components, warehouse, and finished product
      const bom = await this.bomRepository
        .createQueryBuilder('bom')
        .leftJoinAndSelect('bom.bomComponents', 'bomComponents')
        .leftJoinAndSelect('bom.warehouse', 'warehouse')
        .leftJoinAndSelect('bom.bomFinishedProduct', 'bomFinishedProduct')
        .where('bom.masterProductId = :masterProductId', { masterProductId })
        .andWhere('bom.deletedAt IS NULL') // Exclude soft-deleted BOMs
        .andWhere('bomComponents.deletedAt IS NULL') // Exclude soft-deleted components
        .orderBy('bomComponents.id', 'ASC') // Order components by ID
        .getOne();

      if (!bom) {
        throw new RpcException({
          status: 400,
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
              updatedAt: component.updatedAt,
              deletedAt: component.deletedAt
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

      // Get finished product details if exists
      let finishedProductDetails = null;
      if (bom.bomFinishedProduct) {
        let masterProduct;
        try {
          masterProduct = await this.masterProductsService.findOne(bom.bomFinishedProduct.masterProductId);
        } catch (error) {
          this.logger.warn(`Master product not found with ID: ${bom.bomFinishedProduct.masterProductId}`);
          masterProduct = {
            id: bom.bomFinishedProduct.masterProductId,
            name: 'Unknown Product',
            code: 'UNKNOWN',
            availableQuantity: 0,
            status: null
          };
        }

        finishedProductDetails = {
          id: bom.bomFinishedProduct.id,
          bomId: bom.bomFinishedProduct.bomId,
          masterProductId: bom.bomFinishedProduct.masterProductId,
          productName: masterProduct.name,
          productCode: masterProduct.code,
          quantity: bom.bomFinishedProduct.quantity,
          color: bom.bomFinishedProduct.color || null,
          drawers: bom.bomFinishedProduct.drawers || null,
          notes: bom.bomFinishedProduct.notes || null,
          createdAt: bom.bomFinishedProduct.createdAt,
          updatedAt: bom.bomFinishedProduct.updatedAt,
          deletedAt: bom.bomFinishedProduct.deletedAt
        };
      }

      // Construct the response
      return {
        bomId: bom.id,
        name: bom.name,
        warehouseId: bom.warehouse?.id,
        status: bom.status,
        bomComponents: uniqueComponents,
        bomFinishedProduct: finishedProductDetails,
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
      // Find the BOM with its components and finished product
      const bom = await this.bomRepository
        .createQueryBuilder('bom')
        .leftJoinAndSelect('bom.bomComponents', 'bomComponents')
        .leftJoinAndSelect('bom.warehouse', 'warehouse')
        .leftJoinAndSelect('bom.bomFinishedProduct', 'bomFinishedProduct')
        .where('bom.id = :id', { id })
        .andWhere('bom.deletedAt IS NULL') // Exclude soft-deleted BOMs
        .andWhere('bomComponents.deletedAt IS NULL') // Exclude soft-deleted components
        .orderBy('bomComponents.id', 'ASC') // Order components by ID
        .getOne();

      if (!bom) {
        throw new RpcException({
          status: 400,
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
            updatedAt: component.updatedAt,
            deletedAt: component.deletedAt
          } as BomComponentDetailDto;
        })
      );

      // Get finished product details if exists
      let finishedProductDetails = null;
      if (bom.bomFinishedProduct) {
        let masterProduct;
        try {
          masterProduct = await this.masterProductsService.findOne(bom.bomFinishedProduct.masterProductId);
        } catch (error) {
          this.logger.warn(`Master product not found with ID: ${bom.bomFinishedProduct.masterProductId}`);
          masterProduct = {
            id: bom.bomFinishedProduct.masterProductId,
            name: 'Unknown Product',
            code: 'UNKNOWN',
            availableQuantity: 0,
            status: null
          };
        }

        finishedProductDetails = {
          id: bom.bomFinishedProduct.id,
          bomId: bom.bomFinishedProduct.bomId,
          masterProductId: bom.bomFinishedProduct.masterProductId,
          productName: masterProduct.name,
          productCode: masterProduct.code,
          quantity: bom.bomFinishedProduct.quantity,
          color: bom.bomFinishedProduct.color || null,
          drawers: bom.bomFinishedProduct.drawers || null,
          notes: bom.bomFinishedProduct.notes || null,
          createdAt: bom.bomFinishedProduct.createdAt,
          updatedAt: bom.bomFinishedProduct.updatedAt,
          deletedAt: bom.bomFinishedProduct.deletedAt
        };
      }

      // Construct the response
      return {
        bomId: bom.id,
        name: bom.name,
        warehouseId: bom.warehouse?.id,
        status: bom.status,
        bomComponents: componentDetails,
        bomFinishedProduct: finishedProductDetails,
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
      const total = await this.bomComponentRepository.count({
        where: {
          deletedAt: null
        }
      });

      // Get paginated components
      const components = await this.bomComponentRepository.find({
        where: {
          deletedAt: null
        },
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
            updatedAt: component.updatedAt,
            deletedAt: component.deletedAt
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
      // Find all BOMs with their components, warehouse, and finished products for the given warehouse
      const boms = await this.bomRepository
        .createQueryBuilder('bom')
        .leftJoinAndSelect('bom.bomComponents', 'bomComponents')
        .leftJoinAndSelect('bom.warehouse', 'warehouse')
        .leftJoinAndSelect('bom.bomFinishedProduct', 'bomFinishedProduct')
        .where('bom.warehouseId = :warehouseId', { warehouseId })
        .andWhere('bom.deletedAt IS NULL') // Exclude soft-deleted BOMs
        .andWhere('bomComponents.deletedAt IS NULL') // Exclude soft-deleted components
        .orderBy('bom.id', 'ASC') // Order BOMs by ID
        .addOrderBy('bomComponents.id', 'ASC') // Order components by ID
        .getMany();

      if (!boms || boms.length === 0) {
        throw new RpcException({
          status: 400,
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
                  updatedAt: component.updatedAt,
                  deletedAt: component.deletedAt
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

          // Get finished product details if exists
          let finishedProductDetails = null;
          if (bom.bomFinishedProduct) {
            let masterProduct;
            try {
              masterProduct = await this.masterProductsService.findOne(bom.bomFinishedProduct.masterProductId);
            } catch (error) {
              this.logger.warn(`Master product not found with ID: ${bom.bomFinishedProduct.masterProductId}`);
              masterProduct = {
                id: bom.bomFinishedProduct.masterProductId,
                name: 'Unknown Product',
                code: 'UNKNOWN',
                availableQuantity: 0,
                status: null
              };
            }

            finishedProductDetails = {
              id: bom.bomFinishedProduct.id,
              bomId: bom.bomFinishedProduct.bomId,
              masterProductId: bom.bomFinishedProduct.masterProductId,
              productName: masterProduct.name,
              productCode: masterProduct.code,
              quantity: bom.bomFinishedProduct.quantity,
              color: bom.bomFinishedProduct.color || null,
              drawers: bom.bomFinishedProduct.drawers || null,
              notes: bom.bomFinishedProduct.notes || null,
              createdAt: bom.bomFinishedProduct.createdAt,
              updatedAt: bom.bomFinishedProduct.updatedAt,
              deletedAt: bom.bomFinishedProduct.deletedAt
            };
          }

          // Construct the response for each BOM
          return {
            bomId: bom.id,
            name: bom.name,
            warehouseId: bom.warehouse?.id,
            status: bom.status,
            bomComponents: uniqueComponents,
            bomFinishedProduct: finishedProductDetails,
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

  async upsertCrafting(upsertCraftingDto: UpsertCraftingDto) {
    this.logger.log(`Request to upsert crafting: ${JSON.stringify(upsertCraftingDto)}`);

    try {
      // Validate required fields for creating a new crafting record
      if (!upsertCraftingDto.bomId || !upsertCraftingDto.quantity) {
        throw new RpcException({
          status: 400,
          message: 'bomId and quantity are required for creating a crafting record',
          error: 'Bad Request'
        });
      }

      // Check if status is NEW
      if (upsertCraftingDto.status === CraftingStatus.NEW) {
        // Create a new crafting record
        const newCrafting = this.craftingRepository.create({
          bomId: upsertCraftingDto.bomId,
          quantity: upsertCraftingDto.quantity,
          status: CraftingStatus.NEW,
          notes: upsertCraftingDto.notes || null
        });

        const savedCrafting = await this.craftingRepository.save(newCrafting);

        return {
          success: true,
          message: 'Crafting record created successfully',
          craftingId: savedCrafting.id,
          bomId: savedCrafting.bomId,
          quantity: savedCrafting.quantity,
          status: savedCrafting.status,
          notes: savedCrafting.notes,
          createdAt: savedCrafting.createdAt
        };
      }

      // Check if status is DONE
      if (upsertCraftingDto.status === CraftingStatus.DONE) {
        // Get BOM with finished product and warehouse
        const bom = await this.bomRepository.findOne({
          where: { id: upsertCraftingDto.bomId },
          relations: ['bomFinishedProduct', 'warehouse']
        });

        if (!bom) {
          throw new RpcException({
            status: 400,
            message: `BOM not found with ID: ${upsertCraftingDto.bomId}`,
            error: 'Not Found'
          });
        }

        if (!bom.bomFinishedProduct) {
          throw new RpcException({
            status: 400,
            message: `BOM does not have a finished product configured`,
            error: 'Bad Request'
          });
        }

        // Get master product details of the finished product
        let masterProduct;
        try {
          masterProduct = await this.masterProductsService.findOne(bom.bomFinishedProduct.masterProductId);
        } catch (error) {
          this.logger.warn(`Master product not found with ID: ${bom.bomFinishedProduct.masterProductId}`);
          masterProduct = {
            id: bom.bomFinishedProduct.masterProductId,
            name: 'Unknown Product',
            code: 'UNKNOWN',
            availableQuantity: 0,
            status: null
          };
        }

        // Calculate quantity for the finished product based on BOM finished product quantity and crafting quantity
        const finishedProductQuantity = bom.bomFinishedProduct.quantity * upsertCraftingDto.quantity;

        // Create CreateProductDto for the finished product
        const createProductDto: any = {
          name: masterProduct.name,
          totalQuantity: finishedProductQuantity,
          expectedQuantity: finishedProductQuantity,
          cost: 0, // Default value, should be set based on business logic
          salePrice: 0, // Default value, should be set based on business logic
          warehouseId: bom.warehouse.id,
          inboundKind: 'CRAFTING', // Indicates this product was created through crafting
          expireDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Default 1 year from now
          storageDate: new Date(),
          productCode: masterProduct.code,
          idRackReallocate: 0, // Default value
          imageProduct: '', // Default empty
          imageQRCode: '', // Default empty
          imageBarcode: '', // Default empty
          code: `${masterProduct.code}_CRAFTED_${Date.now()}`, // Generate unique code
          note: `Created from crafting BOM ${bom.id} - Finished Product`,
          barCode: '', // Default empty
          blockId: 0, // Default value
          rackId: 0, // Default value
          rackCode: '', // Default empty
          receiptId: 0, // Default value
          supplierId: 0, // Default value
          zoneId: 0, // Default value
          orderId: 0, // Default value
          packageId: 0, // Default value
          masterProductId: bom.bomFinishedProduct.masterProductId,
          productCategoryId: 0, // Default value
          status1: 'ACTIVE' // Default status
        };

        // Create a new crafting record with DONE status
        const newCrafting = this.craftingRepository.create({
          bomId: upsertCraftingDto.bomId,
          quantity: upsertCraftingDto.quantity,
          status: CraftingStatus.DONE,
          notes: upsertCraftingDto.notes || null
        });

        const savedCrafting = await this.craftingRepository.save(newCrafting);

        // Create CreateReceiptDto from the CreateProductDto
        const createReceiptDto: CreateReceiptDto = {
          creatorId: 'SYSTEM', // Default system creator
          creatorName: 'System Crafting', // Default system creator name
          driverName: 'System', // Default driver name
          boothCode: `CRAFT_${bom.id}`, // Generate booth code from BOM ID
          receiptDate: new Date(), // Current date
          description: `Receipt created from crafting BOM ${bom.id} - ${bom.name}`, // Description with BOM details
          warehouseId: bom.warehouse.id, // Use BOM warehouse
          supplierId: 0, // Default supplier ID (no supplier for crafting)
          products: [createProductDto] // Use array with single CreateProductDto
        };

        // Save the receipt to database
        const savedReceipt = await this.receiptsService.create(createReceiptDto);

        return {
          success: true,
          message: 'Crafting record created successfully with DONE status and receipt saved',
          craftingId: savedCrafting.id,
          bomId: savedCrafting.bomId,
          quantity: savedCrafting.quantity,
          status: savedCrafting.status,
          notes: savedCrafting.notes,
          createdAt: savedCrafting.createdAt,
          createProductDto: createProductDto, // Return the CreateProductDto
          receipt: {
            id: savedReceipt.id,
            code: savedReceipt.code,
            description: savedReceipt.description,
            receiptDate: savedReceipt.receiptDate,
            warehouseId: savedReceipt.warehouseId,
            productsCount: savedReceipt.products?.length || 0
          }
        };
      }

      // For other statuses, handle accordingly
      throw new RpcException({
        status: 400,
        message: 'Only NEW and DONE statuses are currently supported for creating crafting records',
        error: 'Bad Request'
      });

    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        status: 500,
        message: error.message || 'An error occurred while creating crafting record',
        error: 'Internal Server Error'
      });
    }
  }

  private async completeCrafting(crafting: Crafting) {
    this.logger.log(`Completing crafting ID: ${crafting.id} and increasing finished product quantity`);

    try {
      // Update the finished product quantity
      const currentFinishedProduct = await this.bomFinishedProductRepository.findOne({
        where: { bomId: crafting.bomId }
      });

      if (!currentFinishedProduct) {
        throw new RpcException({
          status: 400,
          message: `Finished product not found for BOM ID: ${crafting.bomId}`,
          error: 'Not Found'
        });
      }

      // Increase the finished product quantity
      currentFinishedProduct.quantity += crafting.quantity;
      await this.bomFinishedProductRepository.save(currentFinishedProduct);

      // Update master product available quantity
      const masterProduct = await this.masterProductsService.findOne(currentFinishedProduct.masterProductId);
      masterProduct.availableQuantity += crafting.quantity;
      await this.masterProductsService.update(masterProduct.id, masterProduct);

      this.logger.log(`Successfully completed crafting ID: ${crafting.id} and increased finished product quantity by ${crafting.quantity}`);

    } catch (error) {
      this.logger.error(`Error completing crafting ID: ${crafting.id}: ${error.message}`);
      throw error;
    }
  }

  async getCrafting(id: number) {
    this.logger.log(`Request to get crafting ID: ${id}`);

    try {
      const crafting = await this.craftingRepository.findOne({
        where: { id },
        relations: ['bom', 'bom.bomFinishedProduct', 'bom.warehouse']
      });

      if (!crafting) {
        throw new RpcException({
          status: 400,
          message: `Crafting record not found with ID: ${id}`,
          error: 'Not Found'
        });
      }

      return {
        id: crafting.id,
        bomId: crafting.bomId,
        quantity: crafting.quantity,
        status: crafting.status,
        notes: crafting.notes,
        createdAt: crafting.createdAt,
        updatedAt: crafting.updatedAt,
        bom: {
          id: crafting.bom.id,
          name: crafting.bom.name,
          warehouseId: crafting.bom.warehouse?.id
        },
        finishedProduct: crafting.bom.bomFinishedProduct ? {
          id: crafting.bom.bomFinishedProduct.id,
          masterProductId: crafting.bom.bomFinishedProduct.masterProductId,
          quantity: crafting.bom.bomFinishedProduct.quantity
        } : null
      };

    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      throw new RpcException({
        status: 500,
        message: error.message || 'An error occurred while fetching crafting record',
        error: 'Internal Server Error'
      });
    }
  }

  async getAllCrafting(page: number = 1, limit: number = 10, warehouseId: number) {
    this.logger.log(`Request to get all crafting records with pagination: page=${page}, limit=${limit}, warehouseId=${warehouseId}`);

    try {
      const skip = (page - 1) * limit;

      const [craftings, total] = await this.craftingRepository.findAndCount({
        relations: ['bom', 'bom.bomFinishedProduct', 'bom.warehouse'],
        where: {
          bom: {
            warehouse: {
              id: warehouseId
            }
          }
        },
        order: {
          createdAt: 'DESC'
        },
        skip,
        take: limit
      });

      const craftingDetails = await Promise.all(
        craftings.map(async (crafting) => {
          return {
            id: crafting.id,
            bomId: crafting.bomId,
            quantity: crafting.quantity,
            status: crafting.status,
            notes: crafting.notes,
            createdAt: crafting.createdAt,
            updatedAt: crafting.updatedAt,
            bom: {
              id: crafting.bom.id,
              name: crafting.bom.name,
              warehouseId: crafting.bom.warehouse?.id
            },
            finishedProduct: crafting.bom.bomFinishedProduct ? {
              id: crafting.bom.bomFinishedProduct.id,
              masterProductId: crafting.bom.bomFinishedProduct.masterProductId,
              quantity: crafting.bom.bomFinishedProduct.quantity
            } : null
          };
        })
      );

      return {
        data: craftingDetails,
        totalItem: total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };

    } catch (error) {
      throw new RpcException({
        status: 500,
        message: error.message || 'An error occurred while fetching crafting records',
        error: 'Internal Server Error'
      });
    }
  }


}