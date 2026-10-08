import pg from 'pg';

const { Pool } = pg;

export function createPool(databaseUrl) {
  return new Pool({ connectionString: databaseUrl, max: 5 });
}
