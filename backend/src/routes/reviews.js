import { Router } from 'express';
import { asyncRoute, fail, parseId, serializeReview } from '../http.js';
import { requireAuth } from '../session.js';
import { readReviewData } from '../validation.js';

async function requireBook(pool, value) {
  const id = parseId(value, 'Книга не найдена.');
  const result = await pool.query('SELECT id FROM books WHERE id=$1', [id]);
  if (!result.rowCount) fail(404, 'Книга не найдена.');
  return id;
}

const reviewSelect = `
  SELECT r.*, u.name AS user_name
  FROM reviews r JOIN users u ON u.id = r.user_id
`;

export function reviewsRouter(pool) {
  const router = Router();
  router.get('/books/:bookId/reviews', asyncRoute(async (request, response) => {
    const bookId = await requireBook(pool, request.params.bookId);
    const result = await pool.query(`${reviewSelect} WHERE r.book_id=$1 ORDER BY r.created_at DESC, r.id DESC`, [bookId]);
    response.json({ reviews: result.rows.map(serializeReview) });
  }));

  router.post('/books/:bookId/reviews', requireAuth, asyncRoute(async (request, response) => {
    const bookId = await requireBook(pool, request.params.bookId);
    const data = readReviewData(request);
    try {
      const inserted = await pool.query(`
        INSERT INTO reviews (user_id, book_id, rating, text) VALUES ($1,$2,$3,$4) RETURNING id
      `, [request.user.id, bookId, data.rating, data.text]);
      const row = (await pool.query(`${reviewSelect} WHERE r.id=$1`, [inserted.rows[0].id])).rows[0];
      response.location(`/api/books/${bookId}/reviews`).status(201).json({ review: serializeReview(row) });
    } catch (error) {
      if (error.code === '23505') fail(409, 'Вы уже оставили отзыв на эту книгу. Измените существующий отзыв.');
      if (error.code === '23503') fail(404, 'Книга не найдена.');
      throw error;
    }
  }));

  router.put('/reviews/:reviewId', requireAuth, asyncRoute(async (request, response) => {
    const reviewId = parseId(request.params.reviewId, 'Отзыв не найден.');
    const data = readReviewData(request);
    const own = await pool.query('SELECT user_id FROM reviews WHERE id=$1', [reviewId]);
    if (!own.rowCount) fail(404, 'Отзыв не найден.');
    if (own.rows[0].user_id !== request.user.id) fail(403, 'Изменять и удалять отзыв может только его автор.');
    await pool.query('UPDATE reviews SET rating=$1, text=$2, updated_at=now() WHERE id=$3', [data.rating, data.text, reviewId]);
    const row = (await pool.query(`${reviewSelect} WHERE r.id=$1`, [reviewId])).rows[0];
    response.json({ review: serializeReview(row) });
  }));

  router.delete('/reviews/:reviewId', requireAuth, asyncRoute(async (request, response) => {
    const reviewId = parseId(request.params.reviewId, 'Отзыв не найден.');
    const own = await pool.query('SELECT user_id FROM reviews WHERE id=$1', [reviewId]);
    if (!own.rowCount) fail(404, 'Отзыв не найден.');
    if (own.rows[0].user_id !== request.user.id) fail(403, 'Изменять и удалять отзыв может только его автор.');
    await pool.query('DELETE FROM reviews WHERE id=$1', [reviewId]);
    response.json({ message: 'Отзыв удалён.' });
  }));
  return router;
}
