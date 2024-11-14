import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ResponseDTO } from 'src/common/response.dto';
import { REPORTS_PATTERN } from 'src/constants/report.constant';
import { ReportFilter } from './dto/filter-report.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) {}

    @MessagePattern(REPORTS_PATTERN.REPORTS_GET_ALL)
    async findAll(@Payload() reportFilter: ReportFilter): Promise<ResponseDTO> {
  
        reportFilter.page = Number(reportFilter?.page)
        reportFilter.limit = Number(reportFilter?.limit)
  
      return this.reportsService.findAll({
        ...reportFilter
      });
    }
}
