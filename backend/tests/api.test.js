import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { normalizeDatabaseUrl, readConfig } from '../src/config.js';
import { createPool } from '../src/db.js';
import { migrate } from '../src/migrate.js';

const developmentUrl = normalizeDatabaseUrl(process.env.DATABASE_URL);
const testUrl = normalizeDatabaseUrl(process.env.TEST_DATABASE_URL);
const pool = createPool(testUrl);
let app;
let storagePath;

function checkTestDatabase() {
  const development = new URL(developmentUrl);
  const target = new URL(testUrl);
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(target.hostname));
  assert.match(target.pathname, /_test$/);
  assert.notEqual(target.pathname, development.pathname);
}

before(async () => {
  checkTestDatabase();
  await migrate(pool);
  storagePath = await mkdtemp(path.join(os.tmpdir(), 'online-library-'));
  const config = readConfig({
    databaseUrl: testUrl,
    secretKey: 'test-secret',
    secureCookie: false,
    storageDriver: 'local',
    storagePath,
  });
  app = createApp({ config, pool });
});

beforeEach(async () => {
  await pool.query('TRUNCATE reviews, favorites, reading_list, reading_history, books, users RESTART IDENTITY CASCADE');
});

after(async () => {
  await pool.query('TRUNCATE reviews, favorites, reading_list, reading_history, books, users RESTART IDENTITY CASCADE');
  await pool.end();
  await rm(storagePath, { recursive: true, force: true });
});

async function csrf(agent) {
  return (await agent.get('/api/auth/csrf').expect(200)).body.csrf_token;
}

async function send(agent, method, url, body) {
  const token = await csrf(agent);
  return agent[method](url).set('X-CSRFToken', token).send(body);
}

async function register(agent, email) {
  return send(agent, 'post', '/api/auth/register', {
    name: 'Тестовый пользователь',
    email,
    password: 'Password123',
  });
}

async function login(agent, email) {
  return send(agent, 'post', '/api/auth/login', { email, password: 'Password123' });
}

async function makeAdmin(email) {
  await pool.query("UPDATE users SET role='admin' WHERE email=$1", [email]);
}

async function createBook(agent) {
  return send(agent, 'post', '/api/admin/books', {
    title: 'Тестовая книга',
    author: 'Автор',
    genre: 'Роман',
    publication_year: 2024,
    description: 'Описание',
    isbn: 'test-isbn',
    cover_url: null,
  });
}

test('регистрация, вход и выход', async () => {
  const agent = request.agent(app);
  await request(app).get('/api/health').expect(200, { status: 'ok' });
  await agent.post('/api/auth/register').send({}).expect(400);

  const created = await register(agent, 'reader@example.com');
  assert.equal(created.status, 201);
  assert.equal(created.body.user.role, 'user');
  assert.equal((await register(agent, 'reader@example.com')).status, 409);
  assert.equal((await login(agent, 'reader@example.com')).status, 200);
  await agent.get('/api/auth/me').expect(200);
  await send(agent, 'post', '/api/auth/logout').then((response) => assert.equal(response.status, 200));
  await agent.get('/api/auth/me').expect(401);
});

test('каталог и управление книгами', async () => {
  const admin = request.agent(app);
  await register(admin, 'admin@example.com');
  await makeAdmin('admin@example.com');
  await login(admin, 'admin@example.com');

  const created = await createBook(admin);
  assert.equal(created.status, 201);
  const bookId = created.body.book.id;
  const catalog = await request(app).get('/api/books?search=%D0%90%D0%B2%D1%82%D0%BE%D1%80').expect(200);
  assert.equal(catalog.body.pagination.total, 1);

  const updated = await send(admin, 'put', `/api/admin/books/${bookId}`, {
    title: 'Новое название', author: 'Автор', genre: 'Повесть', publication_year: null,
    description: '', isbn: null, cover_url: null,
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.book.title, 'Новое название');
  assert.equal((await send(admin, 'delete', `/api/admin/books/${bookId}`)).status, 200);
  await request(app).get(`/api/books/${bookId}`).expect(404);
});

test('TXT загружает администратор, читает только вошедший пользователь', async () => {
  const admin = request.agent(app);
  await register(admin, 'admin@example.com');
  await makeAdmin('admin@example.com');
  await login(admin, 'admin@example.com');
  const bookId = (await createBook(admin)).body.book.id;

  const token = await csrf(admin);
  await admin.post(`/api/admin/books/${bookId}/content`).set('X-CSRFToken', token)
    .attach('file', Buffer.from('Текст книги', 'utf8'), 'book.txt').expect(200);
  await request(app).get(`/api/books/${bookId}/content`).expect(401);
  const content = await admin.get(`/api/books/${bookId}/content`).expect(200);
  assert.equal(content.text, 'Текст книги');
});

test('личные списки принадлежат пользователю', async () => {
  const first = request.agent(app);
  const second = request.agent(app);
  await register(first, 'first@example.com');
  await makeAdmin('first@example.com');
  await login(first, 'first@example.com');
  const bookId = (await createBook(first)).body.book.id;

  assert.equal((await send(first, 'post', `/api/books/${bookId}/favorite`)).status, 201);
  assert.equal((await send(first, 'post', `/api/books/${bookId}/favorite`)).status, 200);
  await send(first, 'post', `/api/books/${bookId}/reading-list`);
  await send(first, 'post', `/api/books/${bookId}/read`);

  await register(second, 'second@example.com');
  await login(second, 'second@example.com');
  await second.get('/api/me/favorites').expect(200, { items: [] });
  assert.equal((await first.get('/api/me/favorites')).body.items.length, 1);
});

test('отзыв содержит оценку 1–5 и принадлежит автору', async () => {
  const owner = request.agent(app);
  const other = request.agent(app);
  await register(owner, 'owner@example.com');
  await makeAdmin('owner@example.com');
  await login(owner, 'owner@example.com');
  const bookId = (await createBook(owner)).body.book.id;

  const created = await send(owner, 'post', `/api/books/${bookId}/reviews`, { rating: 5 });
  assert.equal(created.status, 201);
  const reviewId = created.body.review.id;
  assert.equal((await send(owner, 'post', `/api/books/${bookId}/reviews`, { rating: 4 })).status, 409);

  await register(other, 'other@example.com');
  await login(other, 'other@example.com');
  assert.equal((await send(other, 'put', `/api/reviews/${reviewId}`, { rating: 1 })).status, 403);
  assert.equal((await send(owner, 'put', `/api/reviews/${reviewId}`, { rating: 3, text: 'Хорошая книга' })).status, 200);
  assert.equal((await request(app).get(`/api/books/${bookId}/reviews`)).body.reviews[0].rating, 3);
});
