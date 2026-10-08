import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
loadEnv({ path: path.join(backendDir, '.env'), quiet: true });

export function normalizeDatabaseUrl(value) {
  return value?.replace(/^postgres(?:ql)?\+psycopg:/, 'postgresql:');
}

export function readConfig(overrides = {}) {
  const config = {
    databaseUrl: normalizeDatabaseUrl(process.env.DATABASE_URL),
    secretKey: process.env.SECRET_KEY,
    secureCookie: process.env.SESSION_COOKIE_SECURE === 'true' || Boolean(process.env.VERCEL),
    maxBookSize: Number(process.env.MAX_BOOK_SIZE_BYTES || 5 * 1024 * 1024),
    storageDriver: process.env.STORAGE_DRIVER || (process.env.BLOB_READ_WRITE_TOKEN ? 'vercel' : 'local'),
    storagePath: path.resolve(backendDir, process.env.BOOK_STORAGE_PATH || 'storage/books'),
    blobToken: process.env.BLOB_READ_WRITE_TOKEN,
    frontendPath: path.resolve(backendDir, '..', 'public'),
    ...overrides,
  };

  if (!config.databaseUrl) throw new Error('DATABASE_URL is required.');
  if (!config.secretKey) throw new Error('SECRET_KEY is required.');
  if (config.storageDriver === 'vercel' && !config.blobToken) {
    throw new Error('BLOB_READ_WRITE_TOKEN is required for Vercel Blob.');
  }
  return config;
}

export { backendDir };
