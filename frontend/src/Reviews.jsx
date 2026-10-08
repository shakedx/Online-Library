import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { api } from './api';
import { useAuth } from './auth';
import { useApi } from './useApi';
import RequestError from './RequestError';
import styles from './Library.module.css';
function Stars({ rating }) {
    return <span className={styles.stars} aria-label={`Оценка: ${rating} из 5`}><span aria-hidden="true">{'★'.repeat(rating)}<span className={styles.emptyStars}>{'★'.repeat(5 - rating)}</span></span></span>;
}
function ReviewForm({ bookId, review, saved, cancel }) {
    const [rating, setRating] = useState(review?.rating ?? 0);
    const [text, setText] = useState(review?.text ?? '');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState();
    async function submit(event) {
        event.preventDefault();
        if (busy)
            return;
        setBusy(true);
        setError(undefined);
        try {
            await api(review ? `/api/reviews/${review.id}` : `/api/books/${bookId}/reviews`, {
                method: review ? 'PUT' : 'POST', body: JSON.stringify({ rating, text }),
            });
            saved();
        }
        catch (error) {
            setError(error);
        }
        finally {
            setBusy(false);
        }
    }
    return <form onSubmit={submit} className={styles.reviewForm}>
    <h3>{review ? 'Изменить свой отзыв' : 'Ваше впечатление'}</h3>
    <fieldset disabled={busy} className={styles.ratingField}>
      <legend>Оценка <span className={styles.hint}>(обязательно)</span></legend>
      <div className={styles.ratingChoices}>{[1, 2, 3, 4, 5].map(value => <label key={value} className={value <= rating ? styles.filledStar : undefined}>
        <input type="radio" name="rating" value={value} checked={rating === value} onChange={() => setRating(value)} required aria-label={`${value} из 5`}/>
        <span aria-hidden="true">★</span>
      </label>)}</div>
      <label className={styles.commentLabel}>Комментарий <span className={styles.hint}>(необязательно)</span>
        <textarea value={text} onChange={event => setText(event.target.value)} maxLength={10000} rows={4} placeholder="Что вам запомнилось в этой книге?"/>
      </label>
      <div className={styles.actions}><button className="button" type="submit">{busy ? 'Сохраняем…' : review ? 'Сохранить изменения' : 'Опубликовать отзыв'}</button>
        {cancel && <button className={styles.secondary} type="button" onClick={cancel}>Отмена</button>}</div>
    </fieldset>
    {error != null && <RequestError error={error}/>}
  </form>;
}
export default function Reviews({ bookId }) {
    const { user } = useAuth();
    const location = useLocation();
    const { data, error, loading, reload } = useApi(`/api/books/${bookId}/reviews`);
    const [editing, setEditing] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [busy, setBusy] = useState(false);
    const [actionError, setActionError] = useState();
    const [notice, setNotice] = useState('');
    const own = data?.reviews.find(review => review.author.id === user?.id);
    async function remove() {
        if (!own || busy)
            return;
        setBusy(true);
        setActionError(undefined);
        try {
            await api(`/api/reviews/${own.id}`, { method: 'DELETE' });
            setConfirmDelete(false);
            setEditing(false);
            setNotice('Отзыв удалён.');
            reload();
        }
        catch (error) {
            setActionError(error);
        }
        finally {
            setBusy(false);
        }
    }
    return <section className={styles.reviews} aria-labelledby="reviews-title">
    <div className={styles.sectionHeading}><h2 id="reviews-title">Отзывы читателей{data ? ` · ${data.reviews.length}` : ''}</h2>
      {data && data.reviews.length > 0 && <span className={styles.average}>★ {(data.reviews.reduce((sum, review) => sum + review.rating, 0) / data.reviews.length).toFixed(1)} / 5</span>}
    </div>
    <p className={styles.hint}>Одна книга — один ваш отзыв. Можно оставить только оценку.</p>
    {notice && <p role="status" className={styles.notice}>{notice}</p>}
    {loading && <p role="status">Загружаем отзывы…</p>}
    {error != null && <RequestError error={error} retry={reload}/>}
    {data && <>
      {user ? (!own || editing) && <ReviewForm key={own?.updated_at ?? 'new'} bookId={bookId} review={own} cancel={own ? () => setEditing(false) : undefined} saved={() => {
                    setEditing(false);
                    setNotice(own ? 'Отзыв обновлён.' : 'Спасибо! Ваш отзыв опубликован.');
                    reload();
                }}/> : <p className={styles.signInPrompt}><Link className="textLink" to="/login" state={{ from: location.pathname }}>Войдите</Link>, чтобы оценить книгу и поделиться впечатлением.</p>}
      {data.reviews.length === 0 && <p className={styles.empty}>Отзывов пока нет. Ваш может стать первым.</p>}
      {data.reviews.map(review => <article key={review.id} className={styles.review}>
        <div className={styles.reviewHeading}><strong>{review.author.name}{review.author.id === user?.id ? ' · вы' : ''}</strong><Stars rating={review.rating}/></div>
        <time className={styles.hint} dateTime={review.created_at}>{new Date(review.created_at).toLocaleDateString('ru-RU')}</time>
        {review.text && <p className={styles.reviewText}>{review.text}</p>}
        {review.author.id === user?.id && !editing && <div className={styles.ownReview}>
          {confirmDelete ? <div><p>Удалить ваш отзыв?</p><div className={styles.actions}><button className={styles.danger} disabled={busy} onClick={remove}>{busy ? 'Удаляем…' : 'Да, удалить отзыв'}</button><button className={styles.secondary} disabled={busy} onClick={() => setConfirmDelete(false)}>Отмена</button></div></div>
                        : <div className={styles.actions}><button className={styles.secondary} onClick={() => { setEditing(true); setActionError(undefined); setNotice(''); }}>Изменить отзыв</button><button className={styles.secondary} onClick={() => { setConfirmDelete(true); setActionError(undefined); setNotice(''); }}>Удалить отзыв</button></div>}
          {actionError != null && <RequestError error={actionError}/>}
        </div>}
      </article>)}
    </>}
  </section>;
}
