import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { ResponseDTO } from 'src/common/response.dto';
import { ZONE_CODE_PATTERN } from 'src/constants/zone.constants';
import { Repository } from 'typeorm';
import { CreateZoneDto } from './dto/create-zone.dto';
import { ZoneFilter } from './dto/filter-zone.dto';
import { Zone } from './entities/zone.entity';
import { ZoneStatus } from './enums/supplier-status.enum';

@Injectable()
export class ZoneService {

  private readonly logger = new Logger(ZoneService.name);

  constructor(
    @InjectRepository(Zone)
    private zoneRepository: Repository<Zone>,
  ) {}

  async create(createZoneDto: CreateZoneDto) {
    this.logger.log(`Request to save Zone: ${createZoneDto.name}`);
    this.validateInputs(createZoneDto);
    await this.checkNameZone(createZoneDto.name, createZoneDto.warehouseId);
    const newZone = this.zoneRepository.create(createZoneDto);
    const res = await this.zoneRepository.save(newZone);
    res.code = ZONE_CODE_PATTERN + res.id;
    await this.zoneRepository.update(res.id, res);
    const zone = await this.zoneRepository.findOne(res.id);
    return zone;
  }

  async findAll(zoneFilter: ZoneFilter): Promise<ResponseDTO> {
    this.logger.log(`Request to get all Zone`);
    const queryBuilder = this.zoneRepository.createQueryBuilder("zone");

    if (zoneFilter.warehouseId) {
      queryBuilder.where("zone.warehouseId = :warehouseId", { warehouseId: zoneFilter.warehouseId })
    }

    if (zoneFilter.zoneName) {
      queryBuilder.andWhere("zone.name LIKE :zoneName", { zoneName: `%${zoneFilter.zoneName}%` })
    }

    queryBuilder.andWhere('zone.status != :status', { status: ZoneStatus.DISABLE });

    if (zoneFilter.startDate && zoneFilter.endDate) {
      const startDate = zoneFilter.startDate;
      const endDate = zoneFilter.endDate;
      queryBuilder.andWhere(`zone.createDate BETWEEN '${startDate}' AND '${endDate}'`)
    }

    if (zoneFilter.sortBy && zoneFilter.sortDirection) {
      if (zoneFilter.sortDirection.toUpperCase() === "DESC")
        queryBuilder.orderBy(`zone.${zoneFilter.sortBy}`, "DESC");
      else queryBuilder.orderBy(`zone.${zoneFilter.sortBy}`, "ASC");
    } else {
      queryBuilder.orderBy("zone.id", "ASC");
    }

    const skippedItems = (zoneFilter?.page - 1) * zoneFilter?.limit;

    if (!isNaN(skippedItems)) {
      queryBuilder
        .skip(skippedItems)
        .take(zoneFilter?.limit)
    }

    const data = queryBuilder.getManyAndCount();

    const res = new ResponseDTO();
    await data?.then(rs => {
      res.totalItem = rs[1];
      res.data = rs[0];
    });
    return res;

  }

  async findOne(id: number): Promise<Zone> {
    this.logger.log(`Request to get Zone: ${id}`);
    const zone = await this.zoneRepository.findOne(id);
    if (zone) {
      return zone;
    }
    throw new RpcException('Not found zone');
  }

  async update(id: number, currentZone: Zone) {
    this.logger.log(`Request to update Zone: ${id}`);
    const beforeUpdate = await this.zoneRepository.findOne(id);
    if (currentZone.name && beforeUpdate.name !== currentZone.name) {
      await this.checkNameZone(currentZone.name, currentZone.warehouseId);
    }

    await this.zoneRepository.update(id, currentZone);
    const updateZone = await this.zoneRepository.findOne(id);
    if (updateZone) {
      return updateZone;
    }
    throw new RpcException('Not found zone');
  }

  async remove(id: number) {
    this.logger.log(`Request to remove Zone: ${id}`);

    const deleteResponse = await this.zoneRepository.findOne(id);
    if (!deleteResponse) {
      throw new RpcException('Not found zone');
    }
    deleteResponse.status = ZoneStatus.DISABLE;
    this.zoneRepository.save(deleteResponse);
  }

  validateInputs(zone) {
    if (zone.capcity) {
      if (zone.capcity < 0) throw new RpcException('Capacity incorrect!');
    }
  }

  async checkNameZone(name: string, warehouseId: number) {
    const queryBuilder = this.zoneRepository.createQueryBuilder("zone");
    queryBuilder.where("zone.warehouseId = :warehouseId", { warehouseId: warehouseId })
    queryBuilder.andWhere("zone.status != :status", { status: ZoneStatus.DISABLE})
    queryBuilder.andWhere("zone.name = :name", { name: name?.trim() })
    const res = await queryBuilder.getCount();
    if (res > 0) throw new RpcException(`This ${name} name already exists`);
  }

}
