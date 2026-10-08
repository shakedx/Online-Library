import { Router } from 'express';
import { asyncRoute, fail, parseId, serializeBook } from '../http.js';
import { requireAuth } from '../session.js';

const lists = [
  { listPath: '/me/favorites', itemPath: '/books/:bookId/favorite', table: 'favorites', date: 'created_at', added: 'Книга добавлена в избранное.', removed: 'Книга удалена из избранного.' },
  { listPath: '/me/reading-list', itemPath: '/books/:bookId/reading-list', table: 'reading_list', date: 'created_at', added: 'Книга добавлена в список «К прочтению».', removed: 'Книга удалена из списка «К прочтению».' },
  { listPath: '/me/history', itemPath: '/books/:bookId/read', table: 'reading_history', date: 'read_at', added: 'Книга отмечена как прочитанная.', removed: 'Книга удалена из истории.' },
];

export function listsRouter(pool) {
  const router = Router();
  for (const list of lists) {
    router.get(list.listPath, requireAuth, asyncRoute(async (request, response) => {
      const result = await pool.query(`
        SELECT b.*, l.${list.date} AS list_date
        FROM ${list.table} l JOIN books b ON b.id = l.book_id
        WHERE l.user_id = $1 ORDER BY l.${list.date} DESC, b.id DESC
      `, [request.user.id]);
      response.json({ items: result.rows.map((row) => ({ book: serializeBook(row), [list.date]: new Date(row.list_date).toISOString() })) });
    }));

    router.post(list.itemPath, requireAuth, asyncRoute(async (request, response) => {
      const bookId = parseId(request.params.bookId, 'Книга не найдена.');
      const exists = await pool.query('SELECT id FROM books WHERE id=$1', [bookId]);
      if (!exists.rowCount) fail(404, 'Книга не найдена.');
      const result = await pool.query(`
        INSERT INTO ${list.table} (user_id, book_id) VALUES ($1, $2)
        ON CONFLICT (user_id, book_id) DO NOTHING
        RETURNING ${list.date}
      `, [request.user.id, bookId]);
      const current = result.rowCount ? result.rows[0] : (await pool.query(`SELECT ${list.date} FROM ${list.table} WHERE user_id=$1 AND book_id=$2`, [request.user.id, bookId])).rows[0];
      response.status(result.rowCount ? 201 : 200).json({ message: list.added, [list.date]: new Date(current[list.date]).toISOString() });
    }));

    router.delete(list.itemPath, requireAuth, asyncRoute(async (request, response) => {
      const bookId = parseId(request.params.bookId, 'Книга не найдена.');
      const book = await pool.query('SELECT id FROM books WHERE id=$1', [bookId]);
      if (!book.rowCount) fail(404, 'Книга не найдена.');
      await pool.query(`DELETE FROM ${list.table} WHERE user_id=$1 AND book_id=$2`, [request.user.id, bookId]);
      response.json({ message: list.removed });
    }));
  }
  return router;
}
