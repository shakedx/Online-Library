import { randomBytes } from 'node:crypto';
import cookieSession from 'cookie-session';
import { HttpError } from './http.js';

export function sessionMiddleware(config) {
  return cookieSession({
    name: 'session',
    keys: [config.secretKey],
    httpOnly: true,
    sameSite: 'lax',
    secure: config.secureCookie,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function csrfToken(request) {
  if (!request.session.csrf) request.session.csrf = randomBytes(24).toString('hex');
  return request.session.csrf;
}

export function requireCsrf(request, _response, next) {
  if (!request.session?.csrf || request.get('X-CSRFToken') !== request.session.csrf) {
    return next(new HttpError(400, 'csrf_error', 'CSRF-токен отсутствует или устарел.'));
  }
  next();
}

export function authMiddleware(pool) {
  return async (request, _response, next) => {
    if (!request.session?.userId) return next();
    try {
      const result = await pool.query(
        'SELECT id, name, email, role, created_at FROM users WHERE id=$1',
        [request.session.userId],
      );
      request.user = result.rows[0];
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireAuth(request, _response, next) {
  if (!request.user) return next(new HttpError(401, 'unauthorized', 'Необходимо войти в аккаунт.'));
  next();
}

export function requireAdmin(request, _response, next) {
  if (!request.user) return next(new HttpError(401, 'unauthorized', 'Необходимо войти в аккаунт.'));
  if (request.user.role !== 'admin') {
    return next(new HttpError(403, 'forbidden', 'Доступ разрешён только администратору.'));
  }
  next();
}
