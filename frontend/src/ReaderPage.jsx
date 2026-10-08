import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { api, apiText } from './api';
import RequestError from './RequestError';
import styles from './Library.module.css';
function Reader({ id }) {
    const [data, setData] = useState();
    const [error, setError] = useState();
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        const controller = new AbortController();
        setData(undefined);
        setError(undefined);
        document.title = 'Чтение — Библиотека';
        Promise.all([
            api(`/api/books/${encodeURIComponent(id)}`, { signal: controller.signal }),
            apiText(`/api/books/${encodeURIComponent(id)}/content`, controller.signal),
        ]).then(([{ book }, text]) => {
            if (!controller.signal.aborted) {
                setData({ book, text });
                document.title = `${book.title} — Чтение`;
            }
        }).catch((error) => { if (!controller.signal.aborted)
            setError(error); });
        return () => controller.abort();
    }, [id, attempt]);
    return <div className={styles.readerPage}>
    <Link className={styles.back} to={`/books/${encodeURIComponent(id)}`}>← К странице книги</Link>
    {!data && !error && <p role="status" className={styles.state}>Открываем книгу…</p>}
    {error != null && <RequestError error={error} retry={() => setAttempt(value => value + 1)}/>}
    {data && <article className={styles.reader}><header><p className={styles.eyebrow}>Время читать</p><h1>{data.book.title}</h1><p>{data.book.author}</p></header>
      <div className={styles.readerText}>{data.text || 'В этой книге пока нет текста.'}</div>
      <footer><p>Вы дочитали книгу?</p><Link className="textLink" to={`/books/${id}`}>Отметьте «Прочитано» на странице книги →</Link></footer>
    </article>}
  </div>;
}
export default function ReaderPage() {
    const { id = '' } = useParams();
    return <Reader key={id} id={id}/>;
}
