# MakonTV — User Actions API (Этап 7)

## Новые endpoints

### Multi-Profiles

| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/api/users/:id/profiles` | Список профилей пользователя |
| POST | `/api/users/:id/profiles` | Создать профиль `{ name, isKids? }` |
| PUT | `/api/users/:id/profiles/:pid` | Обновить профиль |
| DELETE | `/api/users/:id/profiles/:pid` | Удалить профиль |

Лимит профилей определяется тарифом пользователя (`maxProfiles`).

### Reviews

| Method | Endpoint | Описание |
|--------|----------|----------|
| POST | `/api/users/:id/reviews` | Отправить отзыв `{ movieId/seriesId, rating: 1-5, text? }` |
| GET | `/api/users/:id/reviews` | Список отзывов пользователя |

При отправке отзыва автоматически пересчитывается средний рейтинг фильма/сериала.
Повторный отзыв обновляет существующий (один отзыв на контент).

### Referral

| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/api/users/:id/referral` | Реферальная информация (код, кол-во приглашённых, награды) |
| POST | `/api/users/:id/referral/apply` | Применить реферальный код `{ code }` |

Награда: +7 дней Premium за каждого приглашённого.

### Downloads

| Method | Endpoint | Описание |
|--------|----------|----------|
| GET | `/api/users/:id/downloads` | Список загрузок |
| POST | `/api/users/:id/downloads` | Зарегистрировать загрузку `{ movieId/episodeId, fileSize? }` |
| DELETE | `/api/users/:id/downloads/:did` | Удалить запись о загрузке |

### Broadcast

| Method | Endpoint | Описание |
|--------|----------|----------|
| POST | `/api/users/broadcast/notifications` | Отправить уведомление всем (нужен X-Admin-Secret) |

### Watch Progress Auto-Save

Фронт автоматически сохраняет прогресс просмотра каждые 30 секунд через `POST /api/users/:id/history`.
