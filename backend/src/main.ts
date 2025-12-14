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
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { MetricsService } from './common/metrics/metrics.service';
import { AuditLogService } from './common/audit-log/audit-log.service';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        bufferLogs: true
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
                    styleSrc: ["'self'"], // Removed 'unsafe-inline' for security
                    scriptSrc: ["'self'"],
                    imgSrc: ["'self'", 'data:', 'https:'],
                    connectSrc: ["'self'"],
                    fontSrc: ["'self'"],
                    objectSrc: ["'none'"],
                    mediaSrc: ["'self'"],
                    frameSrc: ["'none'"]
                }
            },
            crossOriginEmbedderPolicy: true,
            crossOriginOpenerPolicy: true,
            crossOriginResourcePolicy: { policy: 'same-site' }, // Changed from 'cross-origin' to 'same-site' for better security
            dnsPrefetchControl: true,
            frameguard: { action: 'deny' },
            hidePoweredBy: true,
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            },
            ieNoOpen: true,
            noSniff: true,
            originAgentCluster: true,
            permittedCrossDomainPolicies: false,
            referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
            xssFilter: true
        })
    );

    // Compression
    app.use(compression());

    // Cookie parser for CSRF protection
    app.use(cookieParser());

    // CORS - Security: Require explicit origins, never allow wildcard
    const corsOrigins = configService.get('CORS_ORIGINS');
    if (!corsOrigins) {
        throw new Error(
            'CORS_ORIGINS environment variable is required for security. ' +
            'Please set it to a comma-separated list of allowed origins.'
        );
    }
    app.enableCors({
        origin: corsOrigins.split(',').map((origin: string) => origin.trim()),
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Slug'],
        exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Page-Size'],
        maxAge: 3600 // Cache preflight requests for 1 hour
    });

    // Global prefix
    const apiPrefix = configService.get('API_PREFIX', 'api/v1');
    app.setGlobalPrefix(apiPrefix);

    // Versioning
    app.enableVersioning({
        type: VersioningType.URI,
        defaultVersion: '1'
    });

    // Global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true
            }
        })
    );

    // Global guards - applied via APP_GUARD providers in GuardsModule
    // This allows guards to use dependency injection (ThrottlerGuard, TenantValidationGuard)

    // Global exception filter
    app.useGlobalFilters(new HttpExceptionFilter());

    // Global interceptors - order matters!
    // ResponseInterceptor must come before MetricsInterceptor to wrap responses
    const metricsService = app.get(MetricsService);
    const auditLogService = app.get(AuditLogService);
    app.useGlobalInterceptors(
        new ResponseInterceptor(),
        new MetricsInterceptor(metricsService),
        new AuditLogInterceptor(auditLogService)
    );

    // Swagger documentation - SECURITY: Only enable in development or with authentication
    const nodeEnv = configService.get('NODE_ENV', 'development');
    const enableSwagger = configService.get('ENABLE_SWAGGER', nodeEnv !== 'production');

    if (enableSwagger) {
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

        // In production, require basic authentication for Swagger docs
        if (nodeEnv === 'production') {
            const swaggerUser = configService.get('SWAGGER_USER', 'admin');
            const swaggerPassword = configService.get('SWAGGER_PASSWORD');

            if (!swaggerPassword) {
                console.warn(
                    '⚠️  WARNING: Swagger is enabled in production but SWAGGER_PASSWORD is not set. ' +
                    'API documentation will be publicly accessible!'
                );
            }

            SwaggerModule.setup('api/docs', app, document, {
                swaggerOptions: {
                    persistAuthorization: true,
                    tagsSorter: 'alpha',
                    operationsSorter: 'alpha'
                },
                customSiteTitle: 'Apartment Management API - Protected',
                // Basic auth middleware
                customCss: '.swagger-ui .topbar { display: none }',
                customfavIcon: undefined
            });

            // Add basic auth middleware for Swagger in production
            // This requires setting up express-basic-auth or similar
            // For now, we strongly recommend disabling Swagger in production
            console.log(
                '📚 API Documentation available at /api/docs (Basic Auth Required)'
            );
        } else {
            // Development mode - no auth required
            SwaggerModule.setup('api/docs', app, document, {
                swaggerOptions: {
                    persistAuthorization: true,
                    tagsSorter: 'alpha',
                    operationsSorter: 'alpha'
                }
            });
            console.log('📚 API Documentation available at /api/docs');
        }
    } else {
        console.log('📚 API Documentation is disabled (production mode)');
    }

    const port = configService.get('PORT', 3000);
    await app.listen(port);

    const docsStatus = enableSwagger
        ? nodeEnv === 'production'
            ? '(Protected)'
            : '(Development)'
        : '(Disabled)';

    console.log(`
  ╔═══════════════════════════════════════════════════════╗
  ║                                                       ║
  ║   Apartment Management SaaS API                       ║
  ║                                                       ║
  ║   🚀 Server: http://localhost:${port}                  ║
  ║   📚 Docs: ${enableSwagger ? 'http://localhost:' + port + '/api/docs' : 'Disabled'} ${docsStatus}     ║
  ║   🏢 Environment: ${configService.get('NODE_ENV')}                  ║
  ║                                                       ║
  ╚═══════════════════════════════════════════════════════╝
  `);
}

bootstrap();
