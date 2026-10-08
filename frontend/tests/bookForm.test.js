import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readBookForm } from '../src/bookForm.js';
test('clearing optional metadata sends null and never sends a storage path or role', () => {
    const form = new FormData();
    for (const [name, value] of Object.entries({ title: ' Книга ', author: ' Автор ', genre: ' Роман ', publication_year: '', isbn: '  ', cover_url: '', description: 'Первая\nВторая', text_file_path: 'private.txt', role: 'admin' }))
        form.set(name, value);
    assert.deepEqual(readBookForm(form), { title: 'Книга', author: 'Автор', genre: 'Роман', publication_year: null, isbn: null, cover_url: null, description: 'Первая\nВторая' });
    form.set('publication_year', '2024');
    assert.equal(readBookForm(form).publication_year, 2024);
});
