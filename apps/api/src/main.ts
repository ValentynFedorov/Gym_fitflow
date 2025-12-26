import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.setGlobalPrefix('api/v1');
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.enableCors({
    origin: ['http://localhost:3000'],
    credentials: true,
  });

  const port = process.env.PORT_API || 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API is running on http://localhost:${port}/api/v1`);
}

bootstrap();
