import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config();

// MySQL Field type for typeCast
interface MysqlField {
    type: string;
    length: number;
    string: () => string;
}

export const dataSourceOptions: DataSourceOptions = {
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USERNAME || 'apartment_user',
    password: process.env.DB_PASSWORD || 'apartment_pass_dev',
    database: process.env.DB_DATABASE || 'apartment_management',
    entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
    migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
    synchronize: process.env.DB_SYNCHRONIZE === 'true', // Should be FALSE in production
    migrationsRun: process.env.DB_RUN_MIGRATIONS === 'true', // Auto-run migrations on startup
    logging: process.env.DB_LOGGING === 'true',

    // Performance optimizations
    extra: {
        // Connection pool settings
        connectionLimit: parseInt(process.env.DB_POOL_SIZE || '20'),
        acquireTimeout: parseInt(process.env.DB_POOL_ACQUIRE_TIMEOUT || '30000'),
        waitForConnections: true,
        queueLimit: 0,

        // MySQL specific optimizations
        timezone: '+00:00',
        charset: 'utf8mb4',
        typeCast: function (field: MysqlField, next: () => unknown) {
            if (field.type === 'TINY' && field.length === 1) {
                return field.string() === '1'; // Convert TINYINT(1) to boolean
            }
            return next();
        }
    },

    // Query optimization
    cache: {
        duration: 30000, // 30 seconds default cache
        type: 'database',
        tableName: 'query_cache'
    },

    // Connection options
    maxQueryExecutionTime: 5000, // Log queries taking more than 5s

    // Charset
    charset: 'utf8mb4'
};

const dataSource = new DataSource(dataSourceOptions);

export default dataSource;
