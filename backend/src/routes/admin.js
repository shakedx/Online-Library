import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { asyncRoute, fail, parseId, serializeBook } from '../http.js';
import { requireAdmin } from '../session.js';
import { decodeText, removeText, writeText } from '../storage.js';
import { readBookData } from '../validation.js';

function duplicateIsbn(error) {
  return error.code === '23505' && ['uq_books_isbn', 'ix_books_isbn'].includes(error.constraint);
}

export function adminRouter(pool, config) {
  const router = Router();
  router.use(requireAdmin);
  router.use((_request, response, next) => { response.set('Cache-Control', 'no-store'); next(); });

  router.post('/books', asyncRoute(async (request, response) => {
    const book = readBookData(request);
    try {
      const result = await pool.query(`
        INSERT INTO books (title, author, genre, publication_year, description, isbn, cover_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
      `, [book.title, book.author, book.genre, book.publication_year, book.description, book.isbn, book.cover_url]);
      const data = serializeBook(result.rows[0]);
      response.location(`/api/books/${data.id}`).status(201).json({ book: data });
    } catch (error) {
      if (duplicateIsbn(error)) fail(409, 'Книга с таким ISBN уже существует.');
      throw error;
    }
  }));

  router.put('/books/:bookId', asyncRoute(async (request, response) => {
    const bookId = parseId(request.params.bookId, 'Книга не найдена.');
    const book = readBookData(request);
    try {
      const result = await pool.query(`
        UPDATE books SET title=$1, author=$2, genre=$3, publication_year=$4,
          description=$5, isbn=$6, cover_url=$7, updated_at=now()
        WHERE id=$8 RETURNING *
      `, [book.title, book.author, book.genre, book.publication_year, book.description, book.isbn, book.cover_url, bookId]);
      if (!result.rowCount) fail(404, 'Книга не найдена.');
      response.json({ book: serializeBook(result.rows[0]) });
    } catch (error) {
      if (duplicateIsbn(error)) fail(409, 'Книга с таким ISBN уже существует.');
      throw error;
    }
  }));

  router.delete('/books/:bookId', asyncRoute(async (request, response) => {
    const bookId = parseId(request.params.bookId, 'Книга не найдена.');
    const deleted = await pool.query('DELETE FROM books WHERE id=$1 RETURNING text_file_path', [bookId]);
    if (!deleted.rowCount) fail(404, 'Книга не найдена.');
    const oldPath = deleted.rows[0].text_file_path;
    const result = { message: 'Книга удалена.' };
    if (!await removeText(config, oldPath)) result.warning = 'Запись удалена, но старый TXT требует ручной очистки хранилища.';
    response.json(result);
  }));

  const upload = multer({ storage: multer.memoryStorage(), limits: { files: 1, fileSize: config.maxBookSize } });
  router.post('/books/:bookId/content', (request, response, next) => {
    if (!request.is('multipart/form-data')) {
      try { fail(415, 'Ожидается multipart/form-data с файлом в поле file.'); } catch (error) { next(error); }
      return;
    }
    upload.single('file')(request, response, next);
  }, asyncRoute(async (request, response) => {
    const bookId = parseId(request.params.bookId, 'Книга не найдена.');
    if (!request.file) fail(400, 'Передайте один TXT-файл в поле file.');
    if (Object.keys(request.body ?? {}).length) fail(400, 'Передайте только TXT-файл в поле file.');
    if (path.extname(request.file.originalname).toLowerCase() !== '.txt') fail(400, 'Разрешены только файлы с расширением .txt.');
    const oldBook = await pool.query('SELECT text_file_path FROM books WHERE id=$1', [bookId]);
    if (!oldBook.rowCount) fail(404, 'Книга не найдена.');
    const text = decodeText(request.file.buffer);
    const newPath = await writeText(config, text);
    try {
      const update = await pool.query(
        'UPDATE books SET text_file_path=$1, updated_at=now() WHERE id=$2 RETURNING *',
        [newPath, bookId],
      );
      if (!update.rowCount) fail(404, 'Книга не найдена.');
      const payload = { message: 'Текст книги сохранён.', book: serializeBook(update.rows[0]) };
      const oldPath = oldBook.rows[0].text_file_path;
      if (oldPath && !await removeText(config, oldPath)) {
        payload.warning = 'Новый TXT сохранён, но старый файл не удалось удалить.';
      }
      return response.json(payload);
    } catch (error) {
      await removeText(config, newPath);
      throw error;
    }
  }));

  return router;
}
