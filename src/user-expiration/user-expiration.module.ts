import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserExpiration } from './entities/user-expiration.entity';
import { UserExpirationController } from './user-expiration.controller';
import { UserExpirationService } from './user-expiration.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserExpiration])],
  controllers: [UserExpirationController],
  providers: [UserExpirationService],
  exports: [UserExpirationService],
})
export class UserExpirationModule {}
