import { useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { useAuth } from './auth';
import { useApi } from './useApi';
import { BookCover } from './BookCard';
import BookActions from './BookActions';
import Reviews from './Reviews';
import RequestError from './RequestError';
import styles from './Library.module.css';
export default function BookPage() {
    const { id } = useParams();
    const { user } = useAuth();
    const location = useLocation();
    const { data, error, loading, reload } = useApi(`/api/books/${encodeURIComponent(id ?? '')}`);
    const book = data?.book;
    useEffect(() => { document.title = `${book?.title ?? 'Страница книги'} — Библиотека`; }, [book?.title]);
    return <div className={styles.page}>
    <Link className={styles.back} to="/books">← Каталог книг</Link>
    {loading && <p className={styles.state} role="status">Загружаем книгу…</p>}
    {error != null && <RequestError error={error} retry={reload}/>}
    {book && <>
      <section className={styles.bookDetail}>
        <BookCover key={book.cover_url ?? book.id} book={book}/>
        <div className={styles.bookInfo}>
          <Link className={styles.genre} to={`/books?${new URLSearchParams({ genre: book.genre })}`}>{book.genre}</Link>
          <h1>{book.title}</h1><p className={styles.bookAuthor}>{book.author}</p>
          <dl className={styles.metadata}><div><dt>Год издания</dt><dd>{book.publication_year ?? 'Не указан'}</dd></div><div><dt>ISBN</dt><dd>{book.isbn ?? 'Не указан'}</dd></div></dl>
          <p className={styles.description}>{book.description || 'Описание пока не добавлено.'}</p>
          <Link className="button" to={user ? `/books/${book.id}/read` : '/login'} state={user ? undefined : { from: `/books/${book.id}/read` }}>{user ? 'Читать книгу' : 'Войти и читать'} <span aria-hidden="true">→</span></Link>
          {user ? <BookActions key={`${book.id}-${user.id}`} bookId={book.id}/>
                : <p className={styles.signInPrompt}><Link className="textLink" to="/login" state={{ from: location.pathname }}>Войдите</Link>, чтобы добавлять книгу в личные списки.</p>}
        </div>
      </section>
      <Reviews key={`${book.id}-${user?.id ?? 'guest'}`} bookId={book.id}/>
    </>}
  </div>;
}
