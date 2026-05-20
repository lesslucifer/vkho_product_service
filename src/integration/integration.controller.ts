import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { INTEGRATION_PATTERN } from 'src/constants/integration.constants';
import { CreateApiKeyDto, ListApiKeysDto, RevokeApiKeyDto, ValidateApiKeyDto } from './dto/api-key.dto';
import { IntegrationService } from './integration.service';

@Controller()
export class IntegrationController {
  constructor(private readonly integrationService: IntegrationService) {}

  @MessagePattern(INTEGRATION_PATTERN.API_KEY_CREATE)
  createApiKey(@Payload() dto: CreateApiKeyDto) {
    return this.integrationService.createApiKey(dto);
  }

  @MessagePattern(INTEGRATION_PATTERN.API_KEY_LIST)
  listApiKeys(@Payload() dto: ListApiKeysDto) {
    return this.integrationService.listApiKeys(dto);
  }

  @MessagePattern(INTEGRATION_PATTERN.API_KEY_REVOKE)
  revokeApiKey(@Payload() dto: RevokeApiKeyDto) {
    return this.integrationService.revokeApiKey(dto);
  }

  @MessagePattern(INTEGRATION_PATTERN.API_KEY_VALIDATE)
  validateApiKey(@Payload() dto: ValidateApiKeyDto) {
    return this.integrationService.validateApiKey(dto);
  }
}
