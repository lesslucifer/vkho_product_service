import { ClientOptions, Transport } from '@nestjs/microservices';

export const redisServerOptions: ClientOptions = {
  transport: Transport.REDIS,
  options: {
    url: process.env.REDIS_URL,
  },
};
