import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { API_VERSION } from './api-version';
import {
  FieldError,
  HttpExceptionFilter,
} from './common/filters/http-exception.filter';

export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: API_VERSION,
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

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Kaban API')
    .setDescription('REST API for Kanvas — a real-time Kanban board for teams.')
    .setVersion(API_VERSION)
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  swaggerDocument.security = [{ bearer: [] }];
  SwaggerModule.setup('api/docs', app, swaggerDocument);
}
