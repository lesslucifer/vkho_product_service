import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { USER_EXPIRATION_PATTERN } from 'src/constants/user-expiration.constants';
import { UserExpirationService } from './user-expiration.service';

@Controller()
export class UserExpirationController {
  constructor(private readonly userExpirationService: UserExpirationService) {}

  @MessagePattern(USER_EXPIRATION_PATTERN.USER_EXPIRATION_GET)
  get(@Payload() payload: { userId: string }) {
    return this.userExpirationService.getExpiration(payload.userId);
  }

  @MessagePattern(USER_EXPIRATION_PATTERN.USER_EXPIRATION_SET)
  set(@Payload() payload: { userId: string; expirationDate: string | null }) {
    return this.userExpirationService.setExpiration(payload.userId, payload.expirationDate);
  }

  @MessagePattern(USER_EXPIRATION_PATTERN.USER_EXPIRATION_GET_BY_IDS)
  getByIds(@Payload() payload: { userIds: string[] }) {
    return this.userExpirationService.getExpirationsByUserIds(payload.userIds ?? []);
  }

  @MessagePattern(USER_EXPIRATION_PATTERN.USER_EXPIRATION_GET_EXPIRED_IDS)
  getExpiredIds() {
    return this.userExpirationService.getExpiredUserIds();
  }
}
