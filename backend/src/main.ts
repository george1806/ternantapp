import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { MetricsInterceptor } from './common/interceptors/metrics.interceptor';
import { MetricsService } from './common/metrics/metrics.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Use Winston as the logger
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  const configService = app.get(ConfigService);

  // Security Headers - Helmet.js with strict configuration
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: true,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      dnsPrefetchControl: true,
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      xssFilter: true,
    }),
  );

  // Compression
  app.use(compression());

  // Cookie parser for CSRF protection
  app.use(cookieParser());

  // CORS
  app.enableCors({
    origin: configService.get('CORS_ORIGINS')?.split(',') || '*',
    credentials: true,
  });

  // Global prefix
  const apiPrefix = configService.get('API_PREFIX', 'api/v1');
  app.setGlobalPrefix(apiPrefix);

  // Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global metrics interceptor
  const metricsService = app.get(MetricsService);
  app.useGlobalInterceptors(new MetricsInterceptor(metricsService));

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Apartment Management API')
    .setDescription('Multi-tenant apartment management SaaS API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication and authorization endpoints')
    .addTag('Companies', 'Company management')
    .addTag('Users', 'User management')
    .addTag('Compounds', 'Compound management')
    .addTag('Apartments', 'Apartment/unit management')
    .addTag('Tenants', 'Tenant management')
    .addTag('Occupancies', 'Occupancy tracking')
    .addTag('Invoices', 'Invoice management')
    .addTag('Payments', 'Payment processing')
    .addTag('Reports', 'Reporting and analytics')
    .addTag('Files', 'File management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = configService.get('PORT', 3000);
  await app.listen(port);

  console.log(`
  ╔═══════════════════════════════════════════════════════╗
  ║                                                       ║
  ║   Apartment Management SaaS API                       ║
  ║                                                       ║
  ║   🚀 Server running on: http://localhost:${port}       ║
  ║   📚 API Docs: http://localhost:${port}/api/docs     ║
  ║   🏢 Environment: ${configService.get('NODE_ENV')}                  ║
  ║                                                       ║
  ╚═══════════════════════════════════════════════════════╝
  `);
}

bootstrap();
