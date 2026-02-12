# MakonTV — Backend Monorepo

## Структура

```
makontv/
├── apps/
│   ├── api/           ← Hono API сервер (порт 3001)
│   ├── admin/         ← Админка (Этап 4)
│   └── web/           ← Фронтенд (Этап 5)
├── packages/
│   ├── db/            ← Drizzle ORM: схема, миграции, seed
│   └── shared/        ← Общие типы
├── .env.example
└── package.json
```

## Быстрый старт

### 1. Создать базу данных

Зарегистрируйтесь на [neon.tech](https://neon.tech) (бесплатно) и создайте проект.
Скопируйте `DATABASE_URL`.

### 2. Настроить окружение

```bash
cp .env.example .env
# Вставьте DATABASE_URL в .env
```

### 3. Установить зависимости

```bash
npm install
```

### 4. Применить миграции и заполнить данные

```bash
npm run db:migrate
npm run db:seed
```

### 5. Запустить всё (3 терминала)

```bash
# Терминал 1: API (порт 3001)
npm run dev:api

# Терминал 2: Admin Panel (порт 5173)
npm run dev:admin

# Терминал 3: Frontend (порт 3000)
npm run dev:web
```

### 6. Открыть

| Сервис | URL | Описание |
|--------|-----|----------|
| Frontend | http://localhost:3000 | Основной сайт |
| Admin | http://localhost:5173 | Панель управления |
| API | http://localhost:3001/api | REST API |
| API Docs | http://localhost:3001/api | Список endpoints |

### 7. Для фронта: настроить API URL

В `apps/web/public/index.html` в начале скрипта:
```js
window.MAKONTV_API_URL = 'http://localhost:3001'; // для dev
window.MAKONTV_API_URL = ''; // для production (same origin)
```

## Команды

| Команда | Описание |
|---------|----------|
| `npm run dev` | Запуск API-сервера (dev mode) |
| `npm run db:migrate` | Применить миграции |
| `npm run db:seed` | Заполнить тестовыми данными |
| `npm run db:studio` | Открыть Drizzle Studio (визуальный просмотр БД) |
| `npm run db:reset` | Удалить все таблицы (⚠️ осторожно!) |

## Стек

- **API:** [Hono](https://hono.dev) — ультра-быстрый, serverless-ready
- **ORM:** [Drizzle](https://orm.drizzle.team) — SQL-first, type-safe
- **DB:** [Neon Postgres](https://neon.tech) — serverless Postgres
- **Язык:** TypeScript
- **Деплой:** Vercel (Этап 8)

## Данные

Seed заполняет:
- 10 жанров (RU/UZ)
- 5 актёров/режиссёров
- 6 фильмов с жанрами и кастом
- 2 сериала (18 эпизодов)
- 3 тарифных плана
- 6 подборок (главная)
- 2 пользователя (demo + admin)
- Уведомления, история просмотра, избранное
