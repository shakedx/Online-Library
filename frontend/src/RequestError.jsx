import { ApiError, errorMessage } from './api';
import { useAuth } from './auth';
import styles from './Library.module.css';
export default function RequestError({ error, retry }) {
    const auth = useAuth();
    const expired = error instanceof ApiError && error.status === 401;
    return <div className={styles.error}>
    <p role="alert">{expired ? 'Сессия завершена. Обновите вход, чтобы продолжить.' : errorMessage(error)}</p>
    {expired ? <button className={styles.secondary} onClick={auth.retry}>Обновить вход</button>
            : retry && <button className={styles.secondary} onClick={retry}>Повторить попытку</button>}
  </div>;
}
