import { normalizeDatabaseUrl } from '../src/config.js';
import { createPool } from '../src/db.js';
import { migrate } from '../src/migrate.js';

const databaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);
if (!databaseUrl) throw new Error('Set DATABASE_URL before running migrations.');
const pool = createPool(databaseUrl);
try {
  await migrate(pool);
  console.log('Миграции готовы.');
} finally {
  await pool.end();
}
