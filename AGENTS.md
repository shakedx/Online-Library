# Online Library — правила разработки

## Проект и рабочий процесс

- Это учебная онлайн-библиотека. Код должен быть понятен студенту и объясним на защите.
- Перед задачей прочитай этот файл, `PROJECT_CONTEXT.md` и нужный раздел `docs/SPECIFICATION.md`, затем проверь код и `git status`.
- После законченной задачи обнови `PROJECT_CONTEXT.md`: реализация, решения, проверки и ограничения.
- Выполняй запрошенный этап и необходимые для него исправления. Документацию пиши по-русски, имена в коде — по-английски.

## Стек и архитектура

- Backend: Node.js 22.22+, JavaScript ES modules, Express, PostgreSQL через `pg`.
- Frontend: React, JavaScript/JSX, Vite, React Router, CSS Modules, обычный `fetch`. TypeScript в проекте не используется.
- Production: один проект Vercel и один домен. Express работает как Vercel Function, frontend собирается в `public/`, TXT хранится в private Vercel Blob.
- Каталог собственный; внешние API книг не использовать. PostgreSQL не заменять другой БД, включая интеграционные тесты.
- Простые route-функции работают с SQL напрямую. Выноси только появившуюся повторяемую логику; не создавай заранее лишние слои.
- API имеет префикс `/api`. Ответы — JSON; ошибки — `{"error":{"code":"...","message":"..."}}`. TXT отдаётся как `text/plain`.
- Схема меняется последовательными SQL-миграциями в `backend/migrations`. Ввод и доступ проверяются на backend. Пароли хешируются scrypt; секреты и хеши не возвращаются.
- Авторизация использует подписанную HttpOnly cookie. `SECRET_KEY` обязателен. POST/PUT/PATCH/DELETE требуют CSRF из `/api/auth/csrf`.
- Admin API проверяет роль из БД. Первого администратора назначают `npm run admin:make -- EMAIL`; HTTP-управление ролями не добавлять.
- Каталог публичный, TXT доступен только вошедшим. Загрузка — admin + CSRF, имя генерирует сервер, размер ограничен `MAX_BOOK_SIZE_BYTES`.
- Один пользователь оставляет один отзыв на книгу: целая оценка 1–5 обязательна, комментарий необязателен. Менять и удалять отзыв может только автор.
- Личные списки принадлежат пользователю, не содержат дубликатов; повторный POST не меняет дату. История пополняется только явным действием «Прочитано».

## Окружение и размещение

- Корневые Node.js-зависимости относятся к API; frontend-зависимости находятся в `frontend/`.
- Конфигурация берётся из `DATABASE_URL`, `SECRET_KEY`, `STORAGE_DRIVER`, `BOOK_STORAGE_PATH` и `BLOB_READ_WRITE_TOKEN`.
- `DATABASE_URL` обязателен и указывает на PostgreSQL. Интеграционные тесты принимают только отдельный локальный `TEST_DATABASE_URL` с суффиксом `_test`, без URL-параметров и с именем, отличным от development-БД.
- Локально используется `STORAGE_DRIVER=local`; относительный `BOOK_STORAGE_PATH` считается от `backend/`. На Vercel обязателен `STORAGE_DRIVER=vercel` и private Blob.
- `.env`, секреты, загруженные книги, `node_modules`, `public` и `.vercel` не включать в Git. В `.env.example` только безопасные примеры.
- Основной удалённый репозиторий — GitHub, production-хостинг — Vercel. Production-БД отдельная и подключается через Vercel Marketplace.
- Не добавлять Docker, Redis, ORM и дополнительные framework без реальной необходимости или прямого запроса.

## Обязательные проверки

Из корня проекта:

```powershell
npm test
npm run build
npm audit --audit-level=high
npm --prefix frontend audit --audit-level=high
npm run db:migrate
```

Изменения миграций проверяй на свежей схеме внутри отдельной тестовой PostgreSQL. При изменении запуска проверь `/api/health`, `/api/books` и прямой SPA-маршрут через работающий Express. Исправляй ошибки проверок до объявления задачи завершённой.
