export class ApiError extends Error {
    status;
    code;
    constructor(status, code, message) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
    }
}
async function request(path, options) {
    let response;
    try {
        response = await fetch(path, { ...options, credentials: 'same-origin' });
    }
    catch (error) {
        if (error instanceof Error && error.name === 'AbortError')
            throw error;
        throw new ApiError(0, 'network_error', 'Не удалось связаться с сервером. Проверьте соединение и повторите попытку.');
    }
    if (!response.ok) {
        const data = await parseJson(response);
        throw new ApiError(response.status, typeof data?.error?.code === 'string' ? data.error.code : 'request_failed', typeof data?.error?.message === 'string' && response.status < 500
            ? data.error.message : 'Сервер временно недоступен. Попробуйте ещё раз.');
    }
    return response;
}
async function parseJson(response) {
    try {
        return await response.json();
    }
    catch {
        throw new ApiError(response.status, 'invalid_response', 'Сервер временно недоступен. Попробуйте ещё раз.');
    }
}
async function readJson(path, options) {
    return parseJson(await request(path, options));
}
export async function api(path, options = {}) {
    const method = (options.method ?? 'GET').toUpperCase();
    const headers = new Headers(options.headers);
    headers.set('Accept', 'application/json');
    if (typeof options.body === 'string')
        headers.set('Content-Type', 'application/json');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        // Свежий токен перед каждой записью: учитывает вход, выход и истечение токена.
        const { csrf_token } = await readJson('/api/auth/csrf', {
            signal: options.signal,
        });
        headers.set('X-CSRFToken', csrf_token);
    }
    return readJson(path, { ...options, method, headers });
}
export async function apiText(path, signal) {
    const response = await request(path, { signal, headers: { Accept: 'text/plain' } });
    if (!response.headers.get('Content-Type')?.startsWith('text/plain')) {
        throw new ApiError(response.status, 'invalid_response', 'Не удалось загрузить текст книги. Попробуйте ещё раз.');
    }
    return response.text();
}
export function errorMessage(error) {
    return error instanceof ApiError ? error.message : 'Не удалось выполнить действие. Попробуйте ещё раз.';
}
