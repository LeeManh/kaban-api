import 'dotenv/config';
import './instrument';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigType } from '@nestjs/config';
import { appConfig } from './config';
import {
  FieldError,
  HttpExceptionFilter,
} from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: process.env.FRONTEND_URL,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const fieldErrors: FieldError[] = errors.map((err) => ({
          field: err.property,
          message:
            Object.values(err.constraints ?? {})[0] ?? 'Giá trị không hợp lệ',
        }));
        return new BadRequestException({
          message: 'Dữ liệu không hợp lệ',
          errors: fieldErrors,
        });
      },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(config.port);
}
void bootstrap();
