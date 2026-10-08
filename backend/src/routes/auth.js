import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { asyncRoute, fail, isPrintable, serializeUser } from '../http.js';
import { hashPassword, verifyPassword } from '../password.js';
import { csrfToken, requireAuth } from '../session.js';
import { readCredentials } from '../validation.js';

export function authRouter(pool) {
  const router = Router();
  router.use((_request, response, next) => {
    response.set('Cache-Control', 'no-store');
    next();
  });

  router.get('/csrf', (request, response) => response.json({ csrf_token: csrfToken(request) }));

  router.post('/register', asyncRoute(async (request, response) => {
    const { data, email, password } = readCredentials(request);
    const name = typeof data.name === 'string' ? data.name.trim() : '';
    if (!name || name.length > 120 || !isPrintable(name)) fail(400, 'Имя должно содержать от 1 до 120 печатных символов.');
    const passwordHash = await hashPassword(password);
    try {
      const result = await pool.query(`
        INSERT INTO users (name, email, password_hash, role)
        VALUES ($1, $2, $3, 'user')
        RETURNING id, name, email, role, created_at
      `, [name, email, passwordHash]);
      response.status(201).json({ user: serializeUser(result.rows[0]) });
    } catch (error) {
      if (error.code === '23505') fail(409, 'Пользователь с таким email уже зарегистрирован.');
      throw error;
    }
  }));

  router.post('/login', asyncRoute(async (request, response) => {
    const { email, password } = readCredentials(request);
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user || !await verifyPassword(user.password_hash, password)) fail(401, 'Неверный email или пароль.');
    request.session = { csrf: randomBytes(24).toString('hex'), userId: user.id };
    response.json({ user: serializeUser(user) });
  }));

  router.post('/logout', requireAuth, (request, response) => {
    request.session = null;
    response.json({ message: 'Вы вышли из аккаунта.' });
  });

  router.get('/me', requireAuth, (request, response) => response.json({ user: serializeUser(request.user) }));
  return router;
}
