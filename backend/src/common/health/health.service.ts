import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/typeorm';
import { Connection } from 'typeorm';

@Injectable()
export class HealthService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  async check() {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'disconnected',
      memory: process.memoryUsage(),
      nodeVersion: process.version,
    };

    try {
      // Check database connection
      if (this.connection && this.connection.isInitialized) {
        await this.connection.query('SELECT 1');
        health.database = 'connected';
      }
    } catch (error) {
      health.database = 'error';
      health.status = 'degraded';
    }

    return health;
  }
}
