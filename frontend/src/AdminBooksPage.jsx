import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { api } from './api';
import { readBookForm } from './bookForm';
import { useApi } from './useApi';
import RequestError from './RequestError';
import library from './Library.module.css';
import styles from './AdminBooksPage.module.css';
function BookEditor({ book, saved, close }) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState();
    const [uploadMessage, setUploadMessage] = useState('');
    const [uploadWarning, setUploadWarning] = useState('');
    const title = useRef(null);
    useEffect(() => { title.current?.focus(); }, [book?.id]);
    async function save(event) {
        event.preventDefault();
        if (busy)
            return;
        const data = readBookForm(new FormData(event.currentTarget));
        setBusy(true);
        setError(undefined);
        try {
            const result = await api(book ? `/api/admin/books/${book.id}` : '/api/admin/books', {
                method: book ? 'PUT' : 'POST', body: JSON.stringify(data),
            });
            saved(result.book);
        }
        catch (error) {
            setError(error);
        }
        finally {
            setBusy(false);
        }
    }
    async function upload(event) {
        event.preventDefault();
        if (!book || busy)
            return;
        const form = event.currentTarget;
        const data = new FormData(form);
        setBusy(true);
        setError(undefined);
        setUploadMessage('');
        setUploadWarning('');
        try {
            const result = await api(`/api/admin/books/${book.id}/content`, { method: 'POST', body: data });
            setUploadMessage(result.message);
            setUploadWarning(result.warning ?? '');
            form.reset();
        }
        catch (error) {
            setError(error);
        }
        finally {
            setBusy(false);
        }
    }
    return <section className={styles.editor} aria-labelledby="editor-title">
    <div className={library.sectionHeading}><h2 id="editor-title" ref={title} tabIndex={-1}>{book ? 'Редактирование книги' : 'Новая книга'}</h2>
      <button className={library.secondary} onClick={close} disabled={busy}>Закрыть форму</button></div>
    <form onSubmit={save}>
      <fieldset className={styles.fields} disabled={busy}>
        <legend className="visuallyHidden">Сведения о книге</legend>
        <label>Название *<input name="title" required maxLength={255} defaultValue={book?.title}/></label>
        <label>Автор *<input name="author" required maxLength={255} defaultValue={book?.author}/></label>
        <label>Жанр *<input name="genre" required maxLength={100} defaultValue={book?.genre}/></label>
        <label>Год издания<input name="publication_year" type="number" min={1} max={9999} step={1} defaultValue={book?.publication_year ?? ''}/></label>
        <label>ISBN<input name="isbn" maxLength={32} defaultValue={book?.isbn ?? ''}/></label>
        <label>Адрес обложки<input name="cover_url" type="url" maxLength={2048} placeholder="https://…" defaultValue={book?.cover_url ?? ''}/></label>
        <label className={styles.wide}>Описание<textarea name="description" rows={4} maxLength={10000} defaultValue={book?.description}/></label>
        <div className={`${library.actions} ${styles.wide}`}><button className="button" type="submit">{busy ? 'Подождите…' : book ? 'Сохранить карточку' : 'Создать книгу'}</button>
          {book && <Link className="textLink" to={`/books/${book.id}`}>Открыть страницу книги →</Link>}</div>
      </fieldset>
    </form>
    {book ? <form onSubmit={upload} className={styles.upload}>
      <h3>Текст книги</h3>
      <p className={library.hint}>Выберите TXT в UTF-8. Загрузка заменяет прежний текст этой книги. Допустимый размер проверяет сервер (по умолчанию 5 МиБ).</p>
      <fieldset disabled={busy} className={styles.uploadFields}><legend className="visuallyHidden">Загрузка текста</legend>
        <label>TXT-файл<input name="file" type="file" accept=".txt,text/plain" required/></label>
        <button className={library.secondary} type="submit">{busy ? 'Подождите…' : 'Загрузить / заменить TXT'}</button>
      </fieldset>
      {uploadMessage && <p className={library.notice} role="status">{uploadMessage} <Link className="textLink" to={`/books/${book.id}/read`}>Проверить текст →</Link></p>}
      {uploadWarning && <p className={library.error} role="alert">{uploadWarning}</p>}
    </form> : <p className={library.hint}>После создания карточки можно загрузить текст книги.</p>}
    {error != null && <RequestError error={error}/>}
  </section>;
}
function DeleteBook({ book, done, cancel }) {
    const dialog = useRef(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState();
    useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
    async function remove() {
        if (busy)
            return;
        setBusy(true);
        setError(undefined);
        try {
            const result = await api(`/api/admin/books/${book.id}`, { method: 'DELETE' });
            done(result.warning);
        }
        catch (error) {
            setError(error);
        }
        finally {
            setBusy(false);
        }
    }
    return <dialog ref={dialog} className={styles.dialog} aria-labelledby="delete-title" onCancel={event => { event.preventDefault(); if (!busy)
        cancel(); }}>
    <h2 id="delete-title">Удалить «{book.title}»?</h2>
    <p>Будут удалены карточка, TXT, отзывы и записи этой книги в личных списках. Восстановить их через сайт нельзя.</p>
    {error != null && <RequestError error={error}/>}
    <div className={library.actions}><button className={library.secondary} onClick={cancel} disabled={busy} autoFocus>Отмена</button>
      <button className={library.danger} onClick={remove} disabled={busy}>{busy ? 'Удаляем…' : 'Удалить книгу'}</button></div>
  </dialog>;
}
export default function AdminBooksPage() {
    const [params, setParams] = useSearchParams();
    const query = new URLSearchParams({ limit: '12' });
    for (const name of ['search', 'page']) {
        const value = params.get(name);
        if (value)
            query.set(name, value);
    }
    const { data, error, loading, reload } = useApi(`/api/books?${query}`);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [notice, setNotice] = useState('');
    const [warning, setWarning] = useState('');
    useEffect(() => { document.title = 'Управление книгами — Библиотека'; }, []);
    function search(event) {
        event.preventDefault();
        const value = String(new FormData(event.currentTarget).get('search') ?? '').trim();
        setParams(value ? { search: value } : {});
    }
    function page(number) { const next = new URLSearchParams(params); next.set('page', String(number)); setParams(next); }
    return <div className={library.page}>
    <div className={styles.heading}><div className={library.pageHeading}><p className={library.eyebrow}>Администратор</p><h1>Управление книгами</h1><p>Карточки каталога и тексты для чтения.</p></div>
      <button className="button" disabled={editing !== null} onClick={() => { setEditing('new'); setNotice(''); setWarning(''); }}>+ Добавить книгу</button></div>
    {notice && <p className={library.notice} role="status">{notice}</p>}
    {warning && <p className={library.error} role="alert">{warning}</p>}
    {editing !== null && <BookEditor key={editing === 'new' ? 'new' : editing.id} book={editing === 'new' ? undefined : editing} close={() => setEditing(null)} saved={book => {
                setNotice(editing === 'new' ? 'Книга создана. Теперь можно загрузить TXT.' : 'Карточка сохранена.');
                setEditing(book);
                reload();
            }}/>}
    <form onSubmit={search} key={params.toString()} className={styles.search} role="search" aria-label="Поиск в управлении">
      <label>Название или автор<input name="search" type="search" maxLength={255} defaultValue={params.get('search') ?? ''} placeholder="Найти книгу в каталоге"/></label>
      <button className={library.secondary} type="submit">Найти</button><Link className="textLink" to="/admin/books">Сбросить</Link>
    </form>
    {loading && <p className={library.state} role="status">Загружаем каталог…</p>}
    {error != null && <RequestError error={error} retry={reload}/>}
    {data && <>
      <p className={library.resultCount} role="status">Найдено книг: {data.pagination.total}</p>
      {data.books.length ? <div className={styles.rows}>{data.books.map(book => <article key={book.id} className={styles.row}>
        <div><Link className={styles.bookTitle} to={`/books/${book.id}`}>{book.title}</Link><p>{book.author} · {book.genre}</p></div>
        <div className={library.actions}><button className={library.secondary} disabled={editing !== null} onClick={() => { setEditing(book); setNotice(''); setWarning(''); }} aria-label={`Редактировать «${book.title}»`}>Редактировать / TXT</button>
          <button className={library.danger} disabled={editing !== null} onClick={() => setDeleting(book)} aria-label={`Удалить «${book.title}»`}>Удалить</button></div>
      </article>)}</div> : <p className={library.empty}>Книги не найдены. Измените поиск или добавьте новую книгу.</p>}
      {data.pagination.pages > 1 && <nav className={library.pagination} aria-label="Страницы управления">
        <button className={library.secondary} disabled={data.pagination.page <= 1} onClick={() => page(data.pagination.page - 1)}>← Назад</button><span>Страница {data.pagination.page} из {data.pagination.pages}</span>
        <button className={library.secondary} disabled={data.pagination.page >= data.pagination.pages} onClick={() => page(data.pagination.page + 1)}>Далее →</button>
      </nav>}
    </>}
    {deleting && <DeleteBook book={deleting} cancel={() => setDeleting(null)} done={warning => { setDeleting(null); setWarning(warning ?? ''); setNotice('Книга удалена.'); if (data?.books.length === 1 && data.pagination.page > 1)
        page(data.pagination.page - 1);
    else
        reload(); }}/>}
  </div>;
}
