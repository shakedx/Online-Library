import path from 'node:path';
import express from 'express';
import multer from 'multer';
import { readConfig } from './config.js';
import { createPool } from './db.js';
import { HttpError } from './http.js';
import { authMiddleware, requireCsrf, sessionMiddleware } from './session.js';
import { authRouter } from './routes/auth.js';
import { booksRouter } from './routes/books.js';
import { adminRouter } from './routes/admin.js';
import { listsRouter } from './routes/lists.js';
import { reviewsRouter } from './routes/reviews.js';

export function createApp(options = {}) {
  const config = options.config ?? readConfig();
  const pool = options.pool ?? createPool(config.databaseUrl);
  const app = express();
  app.locals.config = config;
  app.locals.pool = pool;
  if (process.env.VERCEL) app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use((request, response, next) => {
    response.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'same-origin',
    });
    next();
  });
  app.use(express.json({ limit: '1mb', strict: true }));
  app.use(sessionMiddleware(config));
  app.use(authMiddleware(pool));
  app.use('/api', (request, response, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return next();
    return requireCsrf(request, response, next);
  });

  app.use('/api/auth', authRouter(pool));
  app.use('/api/admin', adminRouter(pool, config));
  app.use('/api', booksRouter(pool, config));
  app.use('/api', listsRouter(pool));
  app.use('/api', reviewsRouter(pool));
  app.use('/api', (request, _response, next) => next(new HttpError(404, 'not_found', 'Ресурс API не найден.')));

  app.use(express.static(config.frontendPath, { index: false, fallthrough: true }));
  app.use((request, response, next) => {
    if (!['GET', 'HEAD'].includes(request.method) || !request.accepts('html')) return next();
    response.sendFile(path.join(config.frontendPath, 'index.html'), (error) => {
      if (error) next(new HttpError(503, 'service_unavailable', 'Frontend ещё не собран. Выполните npm run build.'));
    });
  });
  app.use((_request, _response, next) => next(new HttpError(404, 'not_found', 'Страница не найдена.')));

  app.use((error, _request, response, _next) => {
    let normalized = error;
    if (error instanceof SyntaxError && error.type === 'entity.parse.failed') {
      normalized = new HttpError(400, 'bad_request', 'Некорректный JSON.');
    } else if (error.type === 'entity.too.large' || error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      normalized = new HttpError(413, 'request_entity_too_large', 'Запрос или TXT превышает допустимый размер.');
    } else if (error instanceof multer.MulterError) {
      normalized = new HttpError(400, 'bad_request', 'Передайте один TXT-файл в поле file.');
    }
    const status = normalized.status && normalized.status >= 400 && normalized.status < 600 ? normalized.status : 500;
    const code = normalized.code && typeof normalized.code === 'string' && !/^\d+$/.test(normalized.code)
      ? normalized.code : status === 500 ? 'internal_server_error' : 'request_failed';
    const message = status < 500 ? normalized.message : 'Сервер временно недоступен. Попробуйте ещё раз.';
    response.set({ 'Cache-Control': 'no-store', ...(normalized.headers ?? {}) });
    response.status(status).json({ error: { code, message } });
  });
  return app;
}

