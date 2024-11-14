import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { redisServerOptions } from './redis-server.options';

async function bootstrap() {
  const app = await NestFactory.createMicroservice(
    AppModule,
    redisServerOptions,
  );

  await app.listen(async () => {
    console.log(`Application Product is running on: ${process.env.PORT}`);
  });
}
bootstrap();
