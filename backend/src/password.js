import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const parameters = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export async function hashPassword(password) {
  const salt = randomBytes(12).toString('base64url');
  const hash = await scrypt(password, salt, 64, parameters);
  return `scrypt:${parameters.N}:${parameters.r}:${parameters.p}$${salt}$${hash.toString('hex')}`;
}

export async function verifyPassword(stored, password) {
  if (typeof stored !== 'string') return false;
  const [method, salt, encoded] = stored.split('$');
  const [name, n, r, p] = method?.split(':') ?? [];
  if (name !== 'scrypt' || Number(n) !== parameters.N || Number(r) !== parameters.r || Number(p) !== parameters.p
      || !salt || !/^[0-9a-f]{128}$/i.test(encoded || '')) return false;
  const expected = Buffer.from(encoded, 'hex');
  const actual = await scrypt(password, salt, expected.length, {
    N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024,
  });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
