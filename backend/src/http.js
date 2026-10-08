export class HttpError extends Error {
  constructor(status, code, message, headers = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.headers = headers;
  }
}

export function fail(status, message, code) {
  const names = { 400: 'bad_request', 401: 'unauthorized', 403: 'forbidden', 404: 'not_found', 405: 'method_not_allowed', 409: 'conflict', 413: 'request_entity_too_large', 415: 'unsupported_media_type', 422: 'unprocessable_entity', 429: 'too_many_requests', 503: 'service_unavailable' };
  throw new HttpError(status, code || names[status] || 'request_failed', message);
}

export function asyncRoute(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
}

export function parseId(value, message) {
  if (typeof value !== 'string' || !/^[0-9]{1,10}$/.test(value)) fail(404, message);
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1 || id > 2147483647) fail(404, message);
  return id;
}

export function isPrintable(value) {
  return typeof value === 'string' && value.isWellFormed() && !/[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Cn}\p{Zl}\p{Zp}]/u.test(value);
}

export function isText(value) {
  return typeof value === 'string' && value.isWellFormed() && !/[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Cn}\p{Zl}\p{Zp}]/u.test(value.replace(/[\r\n\t]/g, ''));
}

export function requireJson(request) {
  if (!request.is('application/json')) fail(415, 'Ожидается Content-Type application/json.');
  if (!request.body || Array.isArray(request.body) || typeof request.body !== 'object') fail(400, 'Ожидается JSON-объект.');
  return request.body;
}

export function serializeBook(row) {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    genre: row.genre,
    publication_year: row.publication_year,
    description: row.description,
    isbn: row.isbn,
    cover_url: row.cover_url,
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
  };
}

export function serializeUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    created_at: new Date(row.created_at).toISOString(),
  };
}

export function serializeReview(row) {
  return {
    id: row.id,
    book_id: row.book_id,
    author: { id: row.user_id, name: row.user_name ?? row.name },
    rating: row.rating,
    text: row.text,
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
  };
}
