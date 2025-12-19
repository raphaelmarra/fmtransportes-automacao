import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new Logger('FM-CLI');
  const port = process.env.PORT || 3001;

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  app.use(helmet());

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  const corsOrigins = process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://fmtransportes.sdebot.top',
  ];

  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.listen(port);
  logger.log(`FM Transportes API rodando em http://localhost:${port}`);
  logger.log('Endpoints disponiveis:');
  logger.log('  GET  /pedidos/hoje/fmtransportes  - Pedidos FM Transportes de hoje');
  logger.log('  POST /enviar                       - Enviar pedidos para FM');
  logger.log('  GET  /health                       - Status das conexoes');
}

bootstrap().catch((error) => {
  console.error('Erro ao iniciar FM-CLI:', error.message);
  process.exit(1);
});
