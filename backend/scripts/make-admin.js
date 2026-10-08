import { normalizeDatabaseUrl } from '../src/config.js';
import { createPool } from '../src/db.js';

const email = process.argv[2]?.trim().toLowerCase();
if (!email) throw new Error('Usage: npm run admin:make -- user@example.com');
const databaseUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);
if (!databaseUrl) throw new Error('Set DATABASE_URL before assigning an administrator.');
const pool = createPool(databaseUrl);
try {
  const result = await pool.query("UPDATE users SET role = 'admin' WHERE email = $1 RETURNING id", [email]);
  if (!result.rowCount) throw new Error(`User ${email} does not exist.`);
  console.log(`Администратор назначен: ${email}.`);
} finally {
  await pool.end();
}
