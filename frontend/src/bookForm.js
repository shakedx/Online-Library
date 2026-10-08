export function readBookForm(form) {
    const value = (name) => String(form.get(name) ?? '');
    return {
        title: value('title').trim(), author: value('author').trim(), genre: value('genre').trim(),
        publication_year: value('publication_year') ? Number(value('publication_year')) : null,
        description: value('description'), isbn: value('isbn').trim() || null,
        cover_url: value('cover_url').trim() || null,
    };
}
