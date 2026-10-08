import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from './api';
import { bookLists } from './bookLists';
import { useApi } from './useApi';
import BookCard from './BookCard';
import RequestError from './RequestError';
import styles from './Library.module.css';
export default function BookListPage({ kind }) {
    const list = bookLists[kind];
    const { data, error, loading, reload } = useApi(`/api/me/${kind}`);
    const [busy, setBusy] = useState(null);
    const [actionError, setActionError] = useState();
    const [notice, setNotice] = useState('');
    useEffect(() => { document.title = `${list.title} — Библиотека`; }, [list.title]);
    async function remove(bookId) {
        if (busy !== null)
            return;
        setBusy(bookId);
        setActionError(undefined);
        setNotice('');
        try {
            await api(`/api/books/${bookId}/${list.action}`, { method: 'DELETE' });
            setNotice('Книга удалена из списка.');
            reload();
        }
        catch (error) {
            setActionError(error);
        }
        finally {
            setBusy(null);
        }
    }
    return <div className={styles.page}>
    <div className={styles.pageHeading}><p className={styles.eyebrow}>Ваша книжная полка</p><h1>{list.title}</h1><p>{list.description}</p></div>
    {notice && <p role="status" className={styles.notice}>{notice}</p>}
    {actionError != null && <RequestError error={actionError}/>}
    {loading && <p role="status" className={styles.state}>Загружаем вашу полку…</p>}
    {error != null && <RequestError error={error} retry={reload}/>}
    {data && (data.items.length ? <div className={styles.grid}>{data.items.map(item => {
                const date = item.read_at ?? item.created_at;
                return <div key={item.book.id} className={styles.listItem}>
        <BookCard book={item.book}/>
        {date && <p className={styles.hint}>{kind === 'history' ? 'Прочитано' : 'Добавлено'}: <time dateTime={date}>{new Date(date).toLocaleDateString('ru-RU')}</time></p>}
        <button className={styles.secondary} disabled={busy !== null} onClick={() => remove(item.book.id)} aria-label={`Удалить «${item.book.title}» из списка`}>{busy === item.book.id ? 'Удаляем…' : 'Убрать из списка'}</button>
      </div>;
            })}</div> : <div className={styles.empty}><h2>На этой полке пока пусто</h2><p>Добавляйте книги с их страниц в каталоге.</p><Link className="button" to="/books">Найти книгу →</Link></div>)}
  </div>;
}
