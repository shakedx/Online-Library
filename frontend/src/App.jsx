import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router';
import { useAuth } from './auth';
import { errorMessage } from './api';
import AuthPage from './AuthPage';
import CatalogPage from './CatalogPage';
import BookPage from './BookPage';
import ReaderPage from './ReaderPage';
import BookListPage from './BookListPage';
import AdminBooksPage from './AdminBooksPage';
import styles from './App.module.css';
function Header() {
    const { user, status, logout } = useAuth();
    const navigate = useNavigate();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    async function handleLogout() {
        setBusy(true);
        setError('');
        try {
            await logout();
            navigate('/login', { replace: true });
        }
        catch (error) {
            setError(errorMessage(error));
        }
        finally {
            setBusy(false);
        }
    }
    return (<header className={styles.header}>
      <div className={styles.headerInner}>
        <Link to="/" className={styles.brand} aria-label="Библиотека — главная">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <path d="M16 8C12 5 7 5 3 6v20c5-1 9-1 13 2 4-3 8-3 13-2V6c-4-1-9-1-13 2Zm0 0v20" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
            <path d="m8 11 4 1m-4 4 4 1m8-5 4-1m-4 6 4-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span>Библиотека<span className={styles.brandCaption}>пространство для чтения</span></span>
        </Link>
        <nav className={styles.nav} aria-label="Основная навигация">
          {[
            ['/books', 'Каталог'], ['/favorites', 'Избранное'],
            ['/reading-list', 'К прочтению'], ['/history', 'История'],
        ].map(([to, label]) => (<NavLink key={to} to={to} className={({ isActive }) => isActive ? styles.active : undefined}>{label}</NavLink>))}
          {user?.role === 'admin' && <NavLink to="/admin/books" className={({ isActive }) => isActive ? styles.active : undefined}>Управление</NavLink>}
        </nav>
        <div className={styles.account}>
          {status === 'loading' ? <span className={styles.muted}>Проверяем вход…</span> : user ? (<>
              <span className={styles.avatar} aria-hidden="true">{Array.from(user.name)[0]}</span>
              <span className={styles.userName} title={user.name}>{user.name}</span>
              <button className={styles.logout} onClick={handleLogout} disabled={busy}>{busy ? 'Выходим…' : 'Выйти'}</button>
            </>) : <Link className={styles.loginLink} to="/login">Войти <span aria-hidden="true">↗</span></Link>}
        </div>
      </div>
      {error && <p className={styles.headerError} role="alert">{error}</p>}
    </header>);
}
function Layout() {
    const { status, error, retry } = useAuth();
    const { pathname } = useLocation();
    const main = useRef(null);
    useEffect(() => {
        main.current?.focus({ preventScroll: true });
        window.scrollTo(0, 0);
    }, [pathname]);
    return (<div className={styles.shell}>
      <a className={styles.skipLink} href="#main">Перейти к содержимому</a>
      <Header />
      <main id="main" ref={main} tabIndex={-1} className={styles.main}>
        {status === 'loading' ? <p className={styles.sessionStatus} role="status">Проверяем ваш аккаунт…</p>
            : status === 'error' ? (<section className={styles.section}>
              <p className={styles.eyebrow}>Связь с библиотекой</p>
              <h1>Не удалось загрузить аккаунт</h1>
              <p role="alert">{error}</p>
              <button className="button" onClick={retry}>Повторить попытку</button>
            </section>) : <Outlet />}
      </main>
      <footer className={styles.footer}>
        <span>Библиотека</span><span>Хорошие истории — всегда рядом.</span>
      </footer>
    </div>);
}
function RequireAuth({ admin = false }) {
    const { user } = useAuth();
    const location = useLocation();
    if (!user)
        return <Navigate to="/login" replace state={{ from: location.pathname + location.search }}/>;
    if (admin && user.role !== 'admin')
        return <SectionPage title="Доступ ограничен" text="Этот раздел доступен только администратору библиотеки." eyebrow="Нет доступа"/>;
    return <Outlet />;
}
function SectionPage({ title, text, eyebrow = 'Ваша библиотека' }) {
    useEffect(() => { document.title = `${title} — Библиотека`; }, [title]);
    return (<section className={styles.section}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h1>{title}</h1>
      <p>{text}</p>
      <Link className="textLink" to="/">На главную <span aria-hidden="true">→</span></Link>
    </section>);
}
export default function App() {
    return (<Routes>
      <Route element={<Layout />}>
        <Route index element={<CatalogPage home/>}/>
        <Route path="login" element={<AuthPage key="login" mode="login"/>}/>
        <Route path="register" element={<AuthPage key="register" mode="register"/>}/>
        <Route path="books" element={<CatalogPage key="catalog"/>}/>
        <Route path="books/:id" element={<BookPage />}/>
        <Route element={<RequireAuth />}>
          <Route path="favorites" element={<BookListPage key="favorites" kind="favorites"/>}/>
          <Route path="reading-list" element={<BookListPage key="reading-list" kind="reading-list"/>}/>
          <Route path="history" element={<BookListPage key="history" kind="history"/>}/>
          <Route path="books/:id/read" element={<ReaderPage />}/>
        </Route>
        <Route element={<RequireAuth admin/>}>
          <Route path="admin" element={<Navigate to="/admin/books" replace/>}/>
          <Route path="admin/books" element={<AdminBooksPage />}/>
        </Route>
        <Route path="*" element={<SectionPage title="Страница не найдена" text="Возможно, ссылка устарела. Вернитесь на главную страницу библиотеки." eyebrow="Ошибка 404"/>}/>
      </Route>
    </Routes>);
}
