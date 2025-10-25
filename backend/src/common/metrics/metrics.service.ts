import { Injectable, OnModuleInit } from '@nestjs/common';
import { Counter, Histogram, Gauge, register, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  // HTTP request metrics
  public readonly httpRequestsTotal: Counter;
  public readonly httpRequestDuration: Histogram;

  // Database metrics
  public readonly dbQueriesTotal: Counter;
  public readonly dbQueryDuration: Histogram;
  public readonly dbConnectionsActive: Gauge;

  // Auth metrics
  public readonly authAttemptsTotal: Counter;
  public readonly authSuccessTotal: Counter;
  public readonly authFailuresTotal: Counter;

  // Cache metrics
  public readonly cacheHitsTotal: Counter;
  public readonly cacheMissesTotal: Counter;

  // Business metrics
  public readonly activeTenantsGauge: Gauge;
  public readonly activeOccupanciesGauge: Gauge;
  public readonly totalRevenueGauge: Gauge;

  constructor() {
    // HTTP request metrics
    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
    });

    // Database metrics
    this.dbQueriesTotal = new Counter({
      name: 'db_queries_total',
      help: 'Total number of database queries',
      labelNames: ['operation', 'table'],
    });

    this.dbQueryDuration = new Histogram({
      name: 'db_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
    });

    this.dbConnectionsActive = new Gauge({
      name: 'db_connections_active',
      help: 'Number of active database connections',
    });

    // Auth metrics
    this.authAttemptsTotal = new Counter({
      name: 'auth_attempts_total',
      help: 'Total number of authentication attempts',
      labelNames: ['type'],
    });

    this.authSuccessTotal = new Counter({
      name: 'auth_success_total',
      help: 'Total number of successful authentications',
      labelNames: ['type'],
    });

    this.authFailuresTotal = new Counter({
      name: 'auth_failures_total',
      help: 'Total number of failed authentications',
      labelNames: ['type', 'reason'],
    });

    // Cache metrics
    this.cacheHitsTotal = new Counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['key'],
    });

    this.cacheMissesTotal = new Counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['key'],
    });

    // Business metrics
    this.activeTenantsGauge = new Gauge({
      name: 'active_tenants_total',
      help: 'Total number of active tenants',
      labelNames: ['company_id'],
    });

    this.activeOccupanciesGauge = new Gauge({
      name: 'active_occupancies_total',
      help: 'Total number of active occupancies',
      labelNames: ['company_id'],
    });

    this.totalRevenueGauge = new Gauge({
      name: 'total_revenue',
      help: 'Total revenue amount',
      labelNames: ['company_id', 'currency'],
    });
  }

  onModuleInit() {
    // Collect default metrics (CPU, memory, etc.)
    collectDefaultMetrics({
      prefix: 'ternantapp_',
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
    });
  }

  getMetrics(): Promise<string> {
    return register.metrics();
  }

  getContentType(): string {
    return register.contentType;
  }

  // Helper methods for tracking metrics
  trackHttpRequest(method: string, route: string, statusCode: number, duration: number) {
    this.httpRequestsTotal.labels(method, route, statusCode.toString()).inc();
    this.httpRequestDuration.labels(method, route, statusCode.toString()).observe(duration);
  }

  trackDbQuery(operation: string, table: string, duration: number) {
    this.dbQueriesTotal.labels(operation, table).inc();
    this.dbQueryDuration.labels(operation, table).observe(duration);
  }

  trackAuthAttempt(type: string, success: boolean, reason?: string) {
    this.authAttemptsTotal.labels(type).inc();
    if (success) {
      this.authSuccessTotal.labels(type).inc();
    } else {
      this.authFailuresTotal.labels(type, reason || 'unknown').inc();
    }
  }

  trackCacheOperation(key: string, isHit: boolean) {
    if (isHit) {
      this.cacheHitsTotal.labels(key).inc();
    } else {
      this.cacheMissesTotal.labels(key).inc();
    }
  }
}
