import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { WinstonModule } from 'nest-winston';
import { redisStore } from 'cache-manager-redis-yet';
import { RedisClientOptions } from 'redis';
import { dataSourceOptions } from './database/data-source';
import { winstonConfig } from './common/logger/winston.config';
import { TenantMiddleware } from './common/middlewares/tenant.middleware';
// import { TenantModule } from './common/tenant/tenant.module';
import { AuthModule } from './modules/auth/auth.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { UsersModule } from './modules/users/users.module';
import { CompoundsModule } from './modules/compounds/compounds.module';
import { ApartmentsModule } from './modules/apartments/apartments.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { OccupanciesModule } from './modules/occupancies/occupancies.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
// import { FilesModule } from './modules/files/files.module';
// import { AuditModule } from './modules/audit/audit.module';
import { QueueModule } from './common/queue/queue.module';
import { EmailModule } from './common/email/email.module';
import { HealthModule } from './common/health/health.module';
import { MetricsModule } from './common/metrics/metrics.module';
import { GuardsModule } from './common/guards/guards.module';
import { AuditLogModule } from './common/audit-log/audit-log.module';

@Module({
    imports: [
        // Configuration
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
            cache: true
        }),

        // Database with connection pooling
        TypeOrmModule.forRootAsync({
            useFactory: () => ({
                ...dataSourceOptions,
                autoLoadEntities: true,
                extra: {
                    connectionLimit: parseInt(process.env.DB_POOL_SIZE || '20'),
                    acquireTimeout: parseInt(
                        process.env.DB_POOL_ACQUIRE_TIMEOUT || '30000'
                    ),
                    waitForConnections: true,
                    queueLimit: 0
                }
            })
        }),

        // Redis cache
        CacheModule.registerAsync<RedisClientOptions>({
            isGlobal: true,
            useFactory: async (configService: ConfigService) => ({
                store: await redisStore({
                    socket: {
                        host: configService.get('REDIS_HOST', 'localhost'),
                        port: configService.get('REDIS_PORT', 6379)
                    },
                    password: configService.get('REDIS_PASSWORD'),
                    database: configService.get('REDIS_DB', 0),
                    ttl: configService.get('REDIS_TTL', 3600) * 1000
                })
            }),
            inject: [ConfigService]
        }),

        // Rate limiting
        ThrottlerModule.forRootAsync({
            useFactory: (configService: ConfigService) => [
                {
                    ttl: configService.get('THROTTLE_TTL', 60) * 1000,
                    limit: configService.get('THROTTLE_LIMIT', 100)
                }
            ],
            inject: [ConfigService]
        }),

        // Event emitter for domain events
        EventEmitterModule.forRoot({
            wildcard: false,
            delimiter: '.',
            newListener: false,
            removeListener: false,
            maxListeners: 10,
            verboseMemoryLeak: true,
            ignoreErrors: false
        }),

        // Scheduler for cron jobs
        ScheduleModule.forRoot(),

        // Logging with Winston
        WinstonModule.forRoot(winstonConfig),

        // Common modules
        // TenantModule,
        GuardsModule,
        AuditLogModule,
        QueueModule,
        EmailModule,
        HealthModule,
        MetricsModule,

        // Feature modules
        AuthModule,
        CompaniesModule,
        UsersModule,
        CompoundsModule,
        ApartmentsModule,
        TenantsModule,
        OccupanciesModule,
        InvoicesModule,
        PaymentsModule,
        RemindersModule,
        ReportsModule,
        SuperAdminModule,
        DashboardModule
        // FilesModule,
        // AuditModule,
    ]
})
export class AppModule implements NestModule {
    /**
     * Register global middlewares
     * Order matters! Tenant middleware runs first to extract context for all routes.
     */
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(TenantMiddleware)
            .forRoutes('*'); // Apply to all routes
    }
}
