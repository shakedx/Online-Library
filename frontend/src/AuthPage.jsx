import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { api, errorMessage } from './api';
import { useAuth } from './auth';
import styles from './AuthPage.module.css';
export default function AuthPage({ mode }) {
    const registering = mode === 'register';
    const { user, login } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const from = location.state?.from;
    const destination = typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')
        && !from.includes('\\') && !/^\/(login|register)(\/|\?|#|$)/.test(from) ? from : '/';
    useEffect(() => {
        document.title = `${registering ? 'Регистрация' : 'Вход'} — Библиотека`;
    }, [registering]);
    async function handleSubmit(event) {
        event.preventDefault();
        if (busy)
            return;
        const form = event.currentTarget;
        const fields = new FormData(form);
        const email = String(fields.get('email')).trim();
        const password = String(fields.get('password'));
        setError('');
        if (registering && password !== fields.get('confirmPassword')) {
            setError('Пароли не совпадают. Проверьте повтор пароля.');
            form.elements.namedItem('confirmPassword').focus();
            return;
        }
        setBusy(true);
        try {
            if (registering) {
                await api('/api/auth/register', {
                    method: 'POST', body: JSON.stringify({ name: String(fields.get('name')).trim(), email, password }),
                });
                navigate('/login', { replace: true, state: { from: destination, registered: true, email } });
            }
            else {
                await login({ email, password });
                navigate(destination, { replace: true });
            }
        }
        catch (error) {
            setError(errorMessage(error));
        }
        finally {
            setBusy(false);
        }
    }
    if (user)
        return <Navigate to={destination} replace/>;
    return (<div className={styles.page}>
      <div className={styles.breadcrumb}><Link to="/">Библиотека</Link><span aria-hidden="true">/</span><span>{registering ? 'Регистрация' : 'Вход в аккаунт'}</span></div>
      <div className={styles.card}>
        <aside className={styles.story}>
          <span className={styles.storyLabel}><span aria-hidden="true">✳</span> Между строк — целый мир</span>
          <h2>Следующая<br />история<br /><em>ждёт вас.</em></h2>
          <p>Собирайте любимые книги,<br />делитесь впечатлениями<br />и находите время для чтения.</p>
          <div className={styles.books} aria-hidden="true">
            <div className={styles.bookOne}><span>Б</span><i /></div>
            <div className={styles.bookTwo}><i /><i /><i /></div>
            <div className={styles.bookThree}><span>Между<br />строк</span></div>
          </div>
          <span className={styles.storyFoot}>Ваша личная полка начинается здесь.</span>
        </aside>
        <section className={styles.formPanel} aria-labelledby="auth-title">
          <nav className={styles.tabs} aria-label="Аккаунт">
            <Link to="/login" state={{ from: destination }} aria-current={!registering ? 'page' : undefined}>Вход</Link>
            <Link to="/register" state={{ from: destination }} aria-current={registering ? 'page' : undefined}>Регистрация</Link>
          </nav>
          <div className={styles.intro}>
            <span className={styles.eyebrow}>{registering ? 'Начните свою историю' : 'Рады видеть вас снова'}</span>
            <h1 id="auth-title">{registering ? 'Ваша первая страница' : 'С возвращением'}</h1>
            <p>{registering ? 'Создайте аккаунт и обустройте свою библиотеку.' : 'Войдите, чтобы вернуться к любимым книгам.'}</p>
          </div>
          {!registering && location.state?.registered && <p className={styles.success} role="status">Аккаунт создан. Теперь войдите с вашим паролем.</p>}
          {error && <p className={styles.error} id="form-error" role="alert">{error}</p>}
          <form onSubmit={handleSubmit} aria-describedby={error ? 'form-error' : undefined} aria-busy={busy}>
            <fieldset disabled={busy} className={styles.fields}>
              <legend className="visuallyHidden">{registering ? 'Создание аккаунта' : 'Данные для входа'}</legend>
              {registering && <label>Имя<input name="name" autoComplete="name" required maxLength={120} placeholder="Как к вам обращаться"/></label>}
              <label>Электронная почта<input name="email" type="email" autoComplete="email" required maxLength={254} placeholder="you@example.com" defaultValue={!registering && typeof location.state?.email === 'string' ? location.state.email : ''}/></label>
              <label>Пароль
                <span className={styles.passwordField}>
                  <input name="password" aria-label="Пароль" type={showPassword ? 'text' : 'password'} autoComplete={registering ? 'new-password' : 'current-password'} required minLength={8} maxLength={128} placeholder={registering ? 'Придумайте пароль' : 'Введите пароль'} aria-describedby={registering ? 'password-hint' : undefined}/>
                  <button type="button" className={styles.showPassword} onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'} aria-pressed={showPassword}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" stroke="currentColor" strokeWidth="1.5"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>{showPassword && <path d="m3 3 18 18" stroke="currentColor" strokeWidth="1.5"/>}</svg>
                  </button>
                </span>
              </label>
              {registering && <>
                <p className={styles.hint} id="password-hint">От 8 до 128 символов.</p>
                <label>Повторите пароль<input name="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={8} maxLength={128} placeholder="Введите пароль ещё раз"/></label>
              </>}
              <button className={`button ${styles.submit}`} type="submit">{busy ? (registering ? 'Создаём аккаунт…' : 'Входим…') : (registering ? 'Создать аккаунт' : 'Войти в библиотеку')} <span aria-hidden="true">→</span></button>
            </fieldset>
          </form>
          <p className={styles.switch}>{registering ? 'Уже есть аккаунт?' : 'Пока нет аккаунта?'} <Link to={registering ? '/login' : '/register'} state={{ from: destination }}>{registering ? 'Войти' : 'Зарегистрироваться'}</Link></p>
          <div className={styles.note}><span aria-hidden="true">◇</span> Только вы решаете, что будет на вашей полке.</div>
        </section>
      </div>
    </div>);
}
