import { Router } from 'express';
import { asyncRoute, fail, isPrintable, parseId, serializeBook } from '../http.js';
import { requireAuth } from '../session.js';
import { readText } from '../storage.js';

function oneQuery(request, name) {
  const value = request.query[name];
  if (Array.isArray(value)) fail(400, `Параметр ${name} можно передать только один раз.`);
  return value == null ? '' : String(value);
}

function filterValue(request, name, max) {
  const value = oneQuery(request, name).trim();
  if (value.length > max || (value && !isPrintable(value))) fail(400, `${name}: допустимо до ${max} печатных символов.`);
  return value;
}

function like(value) {
  return `%${value.replace(/[\\%_]/g, '\\$&')}%`;
}

export function booksRouter(pool, config) {
  const router = Router();
  router.get('/health', (_request, response) => response.json({ status: 'ok' }));

  router.get('/books', asyncRoute(async (request, response) => {
    const rawPage = oneQuery(request, 'page') || '1';
    const rawLimit = oneQuery(request, 'limit') || '20';
    if (!/^\d+$/.test(rawPage) || !/^\d+$/.test(rawLimit)) fail(400, 'page и limit должны быть целыми числами.');
    const page = Number(rawPage);
    const limit = Number(rawLimit);
    if (page < 1 || page > 2147483647 || limit < 1 || limit > 100) fail(400, 'page должен быть от 1 до 2147483647, limit — от 1 до 100.');
    const filters = {
      search: filterValue(request, 'search', 255),
      author: filterValue(request, 'author', 255),
      isbn: filterValue(request, 'isbn', 32),
      genre: filterValue(request, 'genre', 100),
    };
    const where = [];
    const values = [];
    const add = (sql, value) => { values.push(value); where.push(sql.replace('?', `$${values.length}`)); };
    if (filters.search) {
      values.push(like(filters.search), like(filters.search));
      where.push(`(title ILIKE $${values.length - 1} ESCAPE '\\' OR author ILIKE $${values.length} ESCAPE '\\')`);
    }
    if (filters.author) add("author ILIKE ? ESCAPE '\\'", like(filters.author));
    if (filters.isbn) add('isbn = ?', filters.isbn);
    if (filters.genre) add('lower(genre) = lower(?)', filters.genre);
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const count = await pool.query(`SELECT count(*)::integer AS total FROM books ${clause}`, values);
    const total = count.rows[0].total;
    const rows = await pool.query(`SELECT * FROM books ${clause} ORDER BY id LIMIT $${values.length + 1} OFFSET $${values.length + 2}`, [...values, limit, (page - 1) * limit]);
    response.json({
      books: rows.rows.map(serializeBook),
      pagination: { page, limit, total, pages: total ? Math.ceil(total / limit) : 0 },
    });
  }));

  router.get('/books/:bookId', asyncRoute(async (request, response) => {
    const bookId = parseId(request.params.bookId, 'Книга не найдена.');
    const result = await pool.query('SELECT * FROM books WHERE id = $1', [bookId]);
    if (!result.rowCount) fail(404, 'Книга не найдена.');
    response.json({ book: serializeBook(result.rows[0]) });
  }));

  router.get('/books/:bookId/content', requireAuth, asyncRoute(async (request, response) => {
    const bookId = parseId(request.params.bookId, 'Книга не найдена.');
    const result = await pool.query('SELECT text_file_path FROM books WHERE id=$1', [bookId]);
    if (!result.rowCount) fail(404, 'Книга не найдена.');
    const text = await readText(config, result.rows[0].text_file_path);
    response.set({ 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }).send(text);
  }));
  return router;
}
