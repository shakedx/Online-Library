import { fail, isPrintable, isText, requireJson } from './http.js';

export function readCredentials(request) {
  const data = requireJson(request);
  const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
  if (!email || email.length > 254 || !isPrintable(email) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fail(400, 'Укажите корректный email длиной до 254 символов.');
  }
  const password = data.password;
  if (typeof password !== 'string' || !password.isWellFormed() || password.length < 8 || password.length > 128 || /^\s+$/u.test(password)) {
    fail(400, 'Пароль должен содержать от 8 до 128 символов.');
  }
  return { data, email, password };
}

export function readBookData(request) {
  const data = requireJson(request);
  const allowed = new Set(['title', 'author', 'genre', 'publication_year', 'description', 'isbn', 'cover_url']);
  if (Object.keys(data).some((key) => !allowed.has(key))) fail(400, 'Книга содержит неизвестные или служебные поля.');
  const result = {};
  for (const [field, max] of [['title', 255], ['author', 255], ['genre', 100]]) {
    const value = data[field];
    if (typeof value !== 'string' || value.trim().length < 1 || value.trim().length > max || !isPrintable(value.trim())) {
      fail(400, `${field}: требуется от 1 до ${max} печатных символов.`);
    }
    result[field] = value.trim();
  }
  const year = data.publication_year ?? null;
  if (year !== null && (!Number.isInteger(year) || year < 1 || year > 9999)) {
    fail(400, 'publication_year: целое число от 1 до 9999 или null.');
  }
  result.publication_year = year;
  const description = data.description ?? '';
  if (!isText(description) || description.length > 10000) {
    fail(400, 'description: текст до 10000 символов; допустимы переносы и табуляция.');
  }
  result.description = description;
  for (const [field, max] of [['isbn', 32], ['cover_url', 2048]]) {
    let value = data[field] ?? null;
    if (value !== null) {
      if (typeof value !== 'string' || value.trim().length > max || (value.trim() && !isPrintable(value.trim()))) {
        fail(400, `${field}: строка до ${max} печатных символов или null.`);
      }
      value = value.trim() || null;
    }
    result[field] = value;
  }
  if (result.cover_url !== null) {
    try {
      const url = new URL(result.cover_url);
      if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password || /\s|\\/.test(result.cover_url)) throw new Error();
    } catch {
      fail(400, 'cover_url: укажите полный HTTP(S)-адрес без логина и пароля.');
    }
  }
  return result;
}

export function readReviewData(request) {
  const data = requireJson(request);
  if (Object.keys(data).some((key) => !['rating', 'text'].includes(key))) {
    fail(400, 'Ожидается JSON-объект с rating и необязательным text.');
  }
  if (!Number.isInteger(data.rating) || data.rating < 1 || data.rating > 5) {
    fail(400, 'rating должен быть целым числом от 1 до 5.');
  }
  const text = data.text ?? '';
  if (typeof text !== 'string') fail(400, 'text должен быть строкой; комментарий можно не передавать.');
  const trimmed = text.trim();
  if (!isText(trimmed) || trimmed.length > 10000) fail(400, 'Комментарий должен содержать до 10000 символов текста.');
  return { rating: data.rating, text: trimmed };
}
