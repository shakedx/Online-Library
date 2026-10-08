import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import BookCard from './BookCard';
import RequestError from './RequestError';
import { useApi } from './useApi';
import styles from './Library.module.css';
export default function CatalogPage({ home = false }) {
    const [params, setParams] = useSearchParams();
    const query = new URLSearchParams();
    for (const name of ['search', 'genre', 'page']) {
        const value = params.get(name)?.trim();
        if (!home && value)
            query.set(name, value);
    }
    query.set('limit', home ? '4' : '12');
    const { data, error, loading, reload } = useApi(`/api/books?${query}`);
    useEffect(() => { document.title = home ? 'Библиотека — пространство для чтения' : 'Каталог книг — Библиотека'; }, [home]);
    function search(event) {
        event.preventDefault();
        const fields = new FormData(event.currentTarget);
        const next = new URLSearchParams();
        for (const name of ['search', 'genre']) {
            const value = String(fields.get(name) ?? '').trim();
            if (value)
                next.set(name, value);
        }
        setParams(next);
    }
    function changePage(page) {
        const next = new URLSearchParams(params);
        next.set('page', String(page));
        setParams(next);
        window.scrollTo(0, 0);
    }
    return <div className={styles.page}>
    {home ? <section className={styles.hero}>
      <div><p className={styles.eyebrow}>Время для хорошей книги</p><h1>Ваша следующая<br /><em>история — здесь.</em></h1>
        <p>Находите книги, собирайте свою полку и возвращайтесь к любимым историям.</p>
        <Link className="button" to="/books">Открыть каталог <span aria-hidden="true">→</span></Link></div>
      <div className={styles.heroBooks} aria-hidden="true"><span>Читать.<br />Чувствовать.<br />Открывать.</span><span>Ещё одна<br />глава</span></div>
    </section> : <div className={styles.pageHeading}><p className={styles.eyebrow}>На книжных полках</p><h1>Каталог книг</h1><p>Найдите историю по названию, автору или жанру.</p></div>}

    {home ? <div className={styles.sectionHeading}><h2>Знакомство с библиотекой</h2><Link className="textLink" to="/books">Все книги →</Link></div>
            : <form key={params.toString()} className={styles.filters} onSubmit={search} role="search" aria-label="Поиск книг">
        <label>Название или автор<input type="search" name="search" maxLength={255} defaultValue={params.get('search') ?? ''} placeholder="Например, Пушкин"/></label>
        <label>Жанр<input name="genre" maxLength={100} defaultValue={params.get('genre') ?? ''} placeholder="Например, Роман" aria-describedby="genre-hint"/></label>
        <button className="button" type="submit">Найти</button>
        <Link className="textLink" to="/books">Сбросить</Link>
        <small id="genre-hint" className={styles.filterHint}>Жанр — полное название. Регистр букв не важен.</small>
      </form>}

    {loading && <p className={styles.state} role="status">Загружаем книжные полки…</p>}
    {error != null && <RequestError error={error} retry={reload}/>}
    {data && <>
      {!home && <p className={styles.resultCount} role="status">Найдено книг: {data.pagination.total}</p>}
      {data.books.length ? <div className={styles.grid}>{data.books.map(book => <BookCard key={book.id} book={book}/>)}</div>
                : <div className={styles.empty}><h2>{data.pagination.total ? 'На этой странице нет книг' : 'Книги не найдены'}</h2><p>{home ? 'Загляните сюда немного позже.' : 'Попробуйте изменить запрос или сбросить фильтры.'}</p>{!home && <Link className="textLink" to="/books">Вернуться к каталогу</Link>}</div>}
      {!home && data.pagination.pages > 1 && <nav className={styles.pagination} aria-label="Страницы каталога">
        <button className={styles.secondary} disabled={data.pagination.page <= 1} onClick={() => changePage(data.pagination.page - 1)}>← Назад</button>
        <span>Страница {data.pagination.page} из {data.pagination.pages}</span>
        <button className={styles.secondary} disabled={data.pagination.page >= data.pagination.pages} onClick={() => changePage(data.pagination.page + 1)}>Далее →</button>
      </nav>}
    </>}
  </div>;
}
