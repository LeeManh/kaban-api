import 'dotenv/config';
import './instrument';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigType } from '@nestjs/config';
import { appConfig } from './config';
import { configureApp } from './configure-app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);

  configureApp(app);
  app.enableCors({
    origin: process.env.FRONTEND_URL,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.listen(config.port);
}
void bootstrap();
