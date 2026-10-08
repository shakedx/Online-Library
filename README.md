# Online Library

Учебная онлайн-библиотека на JavaScript. В проекте есть регистрация и вход, каталог книг, чтение TXT, личные списки, отзывы с оценкой 1–5 и страница администратора.

Рабочая версия: https://online-library-liard.vercel.app

## Стек

- Backend: Node.js, Express, PostgreSQL, `pg`;
- Frontend: React, JavaScript/JSX, Vite, React Router, CSS Modules;
- Размещение: Vercel, PostgreSQL и private Vercel Blob для TXT.

## Локальный запуск

Нужны Node.js 22.22+ и PostgreSQL. Создай `backend/.env` по примеру `backend/.env.example`, затем выполни:

```powershell
npm install
npm --prefix frontend install
npm run db:migrate
npm run db:seed
```

Для разработки запусти два терминала:

```powershell
npm run dev
```

```powershell
npm --prefix frontend run dev
```

Frontend откроется на `http://127.0.0.1:5173` и будет передавать запросы `/api` на Express. Проверить готовую сборку можно так:

```powershell
npm run build
npm start
```

Тогда весь сайт будет доступен на `http://127.0.0.1:3000`.

## Команды

```powershell
npm test
npm run build
npm run db:migrate
npm run db:seed
npm run admin:make -- user@example.com
```

Тесты используют только отдельную локальную базу из `TEST_DATABASE_URL`. Её имя должно заканчиваться на `_test`.

## Настройки

| Переменная | Назначение |
| --- | --- |
| `DATABASE_URL` | Подключение к PostgreSQL |
| `TEST_DATABASE_URL` | Отдельная локальная тестовая БД |
| `SECRET_KEY` | Ключ подписи cookie |
| `SESSION_COOKIE_SECURE` | `true` при работе через HTTPS |
| `STORAGE_DRIVER` | `local` локально, `vercel` на Vercel |
| `BOOK_STORAGE_PATH` | Локальная папка TXT относительно `backend/` |
| `MAX_BOOK_SIZE_BYTES` | Максимальный размер TXT |
| `BLOB_READ_WRITE_TOKEN` | Токен Vercel Blob |

`.env`, зависимости, сборка и загруженные книги не включаются в Git.

## Основные правила

- Каталог и отзывы доступны всем, чтение TXT — только после входа.
- Изменяющие запросы требуют CSRF-токен из `GET /api/auth/csrf`.
- Администратор назначается локальной командой, а не через сайт.
- Пользователь может оставить одной книге один отзыв. Оценка обязательна, комментарий можно не писать.
- Избранное, список чтения и история принадлежат только их владельцу.

Все маршруты перечислены в [спецификации](docs/SPECIFICATION.md).

## Размещение на Vercel

1. Отправь проект в GitHub и импортируй репозиторий в Vercel.
2. Подключи PostgreSQL и private Vercel Blob.
3. Добавь переменные `DATABASE_URL`, `SECRET_KEY`, `SESSION_COOKIE_SECURE=true` и `STORAGE_DRIVER=vercel`. Blob создаст `BLOB_READ_WRITE_TOKEN`.
4. Примени миграции командой `npm run db:migrate` с production `DATABASE_URL`.
5. После deploy проверь `/api/health`, каталог, вход, admin-функции и TXT.

Локальные данные не копируются в production автоматически. Следующие изменения можно вносить локально и отправлять в GitHub — Vercel пересоберёт проект.

## Структура

```text
server.js                  запуск Express
backend/src/               API и работа с PostgreSQL
backend/src/routes/        маршруты приложения
backend/migrations/        SQL-миграции
backend/scripts/           миграции, демо-книги, назначение admin
backend/tests/             интеграционные тесты API
frontend/src/              React-интерфейс
frontend/tests/            тесты frontend
vercel.json                настройки Vercel
```

