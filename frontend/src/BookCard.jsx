import { useState } from 'react';
import { Link } from 'react-router';
import styles from './Library.module.css';
export function BookCover({ book }) {
    const [failed, setFailed] = useState(false);
    return <div className={styles.cover} data-tone={book.id % 4}>
    {book.cover_url && !failed
            ? <img src={book.cover_url} alt={`Обложка книги «${book.title}»`} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)}/>
            : <div className={styles.coverLettering} aria-hidden="true"><span>{book.author}</span><strong>{book.title}</strong><span>Библиотека · {book.genre}</span></div>}
  </div>;
}
export default function BookCard({ book }) {
    return <article className={styles.card}>
    <Link to={`/books/${book.id}`} aria-label={`Открыть книгу «${book.title}»`}>
      <BookCover key={book.cover_url ?? book.id} book={book}/>
      <p className={styles.genre}>{book.genre}</p>
      <h2>{book.title}</h2>
      <p className={styles.author}>{book.author}</p>
    </Link>
  </article>;
}
