import 'dotenv/config';
import { DataSource } from 'typeorm';
import { dataSourceOptions } from '../data-source';
import { createSuperAdminSeed } from './create-super-admin.seed';

async function runSeed() {
  const dataSource = new DataSource(dataSourceOptions);

  try {
    await dataSource.initialize();
    console.log('📦 Database connected');

    await createSuperAdminSeed(dataSource);

    await dataSource.destroy();
    console.log('✅ Seed completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

runSeed();
