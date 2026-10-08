import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { api, apiText, ApiError } from '../src/api.js';
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
test('GET sends same-origin cookies without requesting a CSRF token', async () => {
    globalThis.fetch = async (path, options) => {
        assert.equal(path, '/api/auth/me');
        assert.equal(options?.credentials, 'same-origin');
        assert.equal(new Headers(options?.headers).get('X-CSRFToken'), null);
        return Response.json({ user: { id: 1 } });
    };
    assert.deepEqual(await api('/api/auth/me'), { user: { id: 1 } });
});
test('each mutation uses a fresh CSRF token, including after login rotates the session', async () => {
    const paths = [];
    let counter = 0;
    globalThis.fetch = async (path, options) => {
        paths.push(String(path));
        assert.equal(options?.credentials, 'same-origin');
        if (path === '/api/auth/csrf')
            return Response.json({ csrf_token: `token-${++counter}` });
        const headers = new Headers(options?.headers);
        assert.equal(headers.get('X-CSRFToken'), `token-${counter}`);
        if (path === '/api/auth/login') {
            assert.equal(headers.get('Content-Type'), 'application/json');
            assert.equal(options?.body, '{"email":"reader@example.test","password":"example-password"}');
        }
        return Response.json({});
    };
    await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'reader@example.test', password: 'example-password' }) });
    await api('/api/auth/logout', { method: 'POST' });
    assert.deepEqual(paths, ['/api/auth/csrf', '/api/auth/login', '/api/auth/csrf', '/api/auth/logout']);
});
test('validation and duplicate errors keep their status, code and message without retrying', async () => {
    let calls = 0;
    globalThis.fetch = async (path) => {
        calls++;
        if (path === '/api/auth/csrf')
            return Response.json({ csrf_token: 'test-token' });
        return Response.json({ error: { code: 'conflict', message: 'Email уже занят.' } }, { status: 409 });
    };
    await assert.rejects(api('/api/auth/register', { method: 'POST', body: '{}' }), (error) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.status, 409);
        assert.equal(error.code, 'conflict');
        assert.equal(error.message, 'Email уже занят.');
        return true;
    });
    assert.equal(calls, 2);
});
test('a failed CSRF request does not send the mutation', async () => {
    globalThis.fetch = async (path) => {
        assert.equal(path, '/api/auth/csrf');
        return Response.json({ error: { code: 'service_unavailable' } }, { status: 503 });
    };
    await assert.rejects(api('/api/auth/register', { method: 'POST', body: '{}' }), ApiError);
});
test('an unavailable or non-JSON backend gives a readable error', async () => {
    globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
    await assert.rejects(api('/api/auth/me'), { status: 0, code: 'network_error' });
    globalThis.fetch = async () => new Response('<html>proxy error</html>', { status: 502 });
    await assert.rejects(api('/api/auth/me'), { status: 502, code: 'invalid_response' });
    globalThis.fetch = async () => Response.json({ error: { message: 'private server details' } }, { status: 500 });
    await assert.rejects(api('/api/auth/me'), (error) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.message.includes('private'), false);
        return true;
    });
});
test('abort signals reach fetch and cancellation is not presented as a network failure', async () => {
    const controller = new AbortController();
    controller.abort();
    globalThis.fetch = async (_path, options) => {
        assert.equal(options?.signal, controller.signal);
        throw new DOMException('Aborted', 'AbortError');
    };
    await assert.rejects(api('/api/auth/me', { signal: controller.signal }), { name: 'AbortError' });
});
test('reader preserves plain text, sends the session cookie and never marks a book as read', async () => {
    const text = 'Глава 1\n\nТекст <script>не HTML</script>\nС новой строки.';
    let calls = 0;
    globalThis.fetch = async (path, options) => {
        calls++;
        assert.equal(path, '/api/books/1/content');
        assert.equal(options?.credentials, 'same-origin');
        assert.equal(options?.method ?? 'GET', 'GET');
        return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    };
    assert.equal(await apiText('/api/books/1/content'), text);
    assert.equal(calls, 1);
});
test('TXT upload uses CSRF and lets the browser set the multipart boundary', async () => {
    const form = new FormData();
    form.set('file', new Blob(['Текст книги'], { type: 'text/plain' }), 'book.txt');
    globalThis.fetch = async (path, options) => {
        if (path === '/api/auth/csrf')
            return Response.json({ csrf_token: 'upload-token' });
        assert.equal(path, '/api/admin/books/1/content');
        assert.equal(options?.body, form);
        const headers = new Headers(options?.headers);
        assert.equal(headers.get('Content-Type'), null);
        assert.equal(headers.get('X-CSRFToken'), 'upload-token');
        return Response.json({ message: 'Текст книги сохранён.' });
    };
    await api('/api/admin/books/1/content', { method: 'POST', body: form });
});
test('reader surfaces missing text and expired sessions instead of rendering JSON or HTML as a book', async () => {
    for (const status of [401, 404]) {
        globalThis.fetch = async () => Response.json({ error: { code: 'unavailable', message: 'Текст недоступен.' } }, { status });
        await assert.rejects(apiText('/api/books/1/content'), { status, message: 'Текст недоступен.' });
    }
    globalThis.fetch = async () => new Response('<html>fallback</html>', { headers: { 'Content-Type': 'text/html' } });
    await assert.rejects(apiText('/api/books/1/content'), { code: 'invalid_response' });
});
