import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Security & Compression Headers
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    }),
  );
  app.use(compression());

  // CORS Configuration
  app.enableCors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-api-key',
      'x-tenant-id',
      'tenant-id',
      'x-correlation-id',
      'X-Correlation-ID',
      'x-request-id',
    ],
  });

  // Global DTO Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global Error Sanitization & Tracing
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TimeoutInterceptor(30000),
  );

  // Global API Prefix with verified route exclusions
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'health/ready', '/'],
  });

  // OpenAPI Swagger Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('AI RAG Quality & Knowledge Operations API')
    .setDescription(
      'Enterprise platform for RAG retrieval benchmarking, citation verification, stale knowledge detection, and reviewed documentation operations.',
    )
    .setVersion('1.0.0')
    .addApiKey(
      { type: 'apiKey', name: 'x-tenant-id', in: 'header' },
      'x-tenant-id',
    )
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'x-api-key')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // Respect platform-provided PORT and bind to 0.0.0.0 for Render hosting
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
  await app.listen(port, '0.0.0.0');

  logger.log(
    `🚀 AI RAG Quality Ops API running on http://0.0.0.0:${port}/api/v1`,
  );
  logger.log(`📚 Swagger documentation at http://0.0.0.0:${port}/api/docs`);
  logger.log(`🩺 Liveness health check at http://0.0.0.0:${port}/health`);
  logger.log(`🩺 Readiness check at http://0.0.0.0:${port}/health/ready`);
}

bootstrap();
