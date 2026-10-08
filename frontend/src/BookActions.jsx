import { useEffect, useState } from 'react';
import { api } from './api';
import { bookLists } from './bookLists';
import RequestError from './RequestError';
import styles from './Library.module.css';
const kinds = Object.keys(bookLists);
export default function BookActions({ bookId }) {
    const [selected, setSelected] = useState(null);
    const [error, setError] = useState();
    const [busy, setBusy] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [notice, setNotice] = useState('');
    useEffect(() => {
        const controller = new AbortController();
        setSelected(null);
        setError(undefined);
        Promise.all(kinds.map(async (kind) => {
            const data = await api(`/api/me/${kind}`, { signal: controller.signal });
            return { kind, present: data.items.some(item => item.book.id === bookId) };
        })).then(results => {
            if (!controller.signal.aborted)
                setSelected(new Set(results.filter(item => item.present).map(item => item.kind)));
        }).catch((error) => { if (!controller.signal.aborted)
            setError(error); });
        return () => controller.abort();
    }, [bookId, attempt]);
    async function toggle(kind) {
        if (!selected || busy)
            return;
        setBusy(true);
        setError(undefined);
        setNotice('');
        const removing = selected.has(kind);
        try {
            await api(`/api/books/${bookId}/${bookLists[kind].action}`, { method: removing ? 'DELETE' : 'POST' });
            const next = new Set(selected);
            if (removing)
                next.delete(kind);
            else
                next.add(kind);
            setSelected(next);
            setNotice(removing ? `Книга удалена из списка «${bookLists[kind].title}».` : `Книга добавлена в список «${bookLists[kind].title}».`);
        }
        catch (error) {
            setError(error);
        }
        finally {
            setBusy(false);
        }
    }
    return <div className={styles.bookActions}>
    {!selected && !error && <p role="status">Загружаем ваши списки…</p>}
    {selected && <div className={styles.actions}>{kinds.map(kind => <button key={kind} className={styles.secondary} aria-pressed={selected.has(kind)} disabled={busy} onClick={() => toggle(kind)}>
      {selected.has(kind) && <span aria-hidden="true">✓ </span>}{selected.has(kind) ? bookLists[kind].selected : bookLists[kind].button}
    </button>)}</div>}
    {error != null && <RequestError error={error} retry={!selected ? () => setAttempt(value => value + 1) : undefined}/>}
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    <p className={styles.hint}>История пополняется только по кнопке «Прочитано».</p>
  </div>;
}
