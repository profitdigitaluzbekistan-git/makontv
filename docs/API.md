# MakonTV API Documentation

**Base URL:** `http://localhost:3001`
**i18n:** Добавьте `?lang=uz` к любому GET-запросу для узбекского. По умолчанию — `ru`.

---

## Общие параметры

| Параметр | Описание | Пример |
|----------|----------|--------|
| `lang` | Язык ответа: `ru` или `uz` | `?lang=uz` |
| `page` | Номер страницы (от 1) | `?page=2` |
| `limit` | Элементов на странице (max 100) | `?limit=10` |

---

## Endpoints

### `GET /api/home`
Данные для главной страницы: hero-баннер + подборки.

**Response:**
```json
{
  "hero": [
    {
      "type": "movie",
      "id": "uuid",
      "slug": "ten-samarkanda",
      "title": "Тень Самарканда",
      "shortDesc": "...",
      "rating": "8.4",
      "year": 2024,
      "quality": "4K",
      "posterUrl": "...",
      "backdropUrl": "..."
    }
  ],
  "collections": [
    {
      "slug": "trending",
      "title": "Популярное",
      "items": [ /* movies/series */ ]
    }
  ]
}
```

---

### `GET /api/genres`
Список всех жанров.

**Response:**
```json
[
  { "id": "uuid", "slug": "thriller", "name": "Триллер", "icon": null, "sortOrder": 0 }
]
```

---

### `GET /api/movies`
Каталог фильмов с фильтрами и пагинацией.

**Query Parameters:**
| Параметр | Описание | Пример |
|----------|----------|--------|
| `genre` | Фильтр по жанру (slug) | `?genre=thriller` |
| `year` | Фильтр по году | `?year=2024` |
| `quality` | Фильтр по качеству | `?quality=4K` |
| `sort` | Сортировка: `new`, `rating`, `year` | `?sort=rating` |

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "slug": "ten-samarkanda",
      "title": "Тень Самарканда",
      "year": 2024,
      "rating": "8.4",
      "quality": "4K",
      "posterUrl": "...",
      "genres": [
        { "slug": "thriller", "name": "Триллер" }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 6,
    "totalPages": 1
  }
}
```

---

### `GET /api/movies/:slug`
Полная информация о фильме.

**Response:**
```json
{
  "id": "uuid",
  "slug": "ten-samarkanda",
  "title": "Тень Самарканда",
  "description": "Загадочные исчезновения...",
  "year": 2024,
  "durationMin": 138,
  "rating": "8.4",
  "ratingCount": 1247,
  "ageRating": "16+",
  "country": "Узбекистан",
  "quality": "4K",
  "posterUrl": "...",
  "backdropUrl": "...",
  "trailerUrl": "...",
  "videoUrl": "...",
  "videoType": "url",
  "isPremium": true,
  "genres": [ { "slug": "thriller", "name": "Триллер" } ],
  "cast": [
    {
      "id": "uuid",
      "name": "Азиз Каримов",
      "photoUrl": "...",
      "role": "actor",
      "characterName": "Следователь Камол"
    }
  ],
  "reviews": [
    {
      "id": "uuid",
      "rating": 5,
      "text": "Отличный фильм!",
      "userName": "Мадина Каримова",
      "createdAt": "2024-01-15T..."
    }
  ],
  "similar": [ /* movies */ ]
}
```

---

### `GET /api/series`
Каталог сериалов. Те же фильтры, что у movies.

**Дополнительные поля в ответе:**
- `seasonCount` — количество сезонов
- `episodeCount` — общее число эпизодов

---

### `GET /api/series/:slug`
Детали сериала + сезоны + эпизоды.

**Response:**
```json
{
  "title": "Код: Ташкент",
  "...": "...",
  "seasons": [
    {
      "number": 1,
      "title": "Сезон 1",
      "episodes": [
        {
          "number": 1,
          "title": "Пробуждение",
          "durationMin": 45,
          "isFree": true,
          "videoUrl": "...",
          "thumbnailUrl": "..."
        }
      ]
    }
  ],
  "cast": [ /* persons */ ],
  "reviews": [ /* reviews */ ],
  "similar": [ /* series */ ]
}
```

---

### `GET /api/search?q=текст`
Поиск по фильмам, сериалам и актёрам.

**Response:**
```json
{
  "results": [
    { "type": "movie", "id": "...", "slug": "...", "title": "...", "year": 2024, "rating": "8.4" },
    { "type": "series", "id": "...", "slug": "...", "title": "...", "year": 2024 },
    { "type": "person", "id": "...", "name": "...", "photoUrl": "..." }
  ],
  "query": "текст",
  "total": 3
}
```

---

### `GET /api/persons/:id`
Страница актёра: био + фильмография.

**Response:**
```json
{
  "id": "uuid",
  "name": "Азиз Каримов",
  "bio": "Биография актёра...",
  "birthPlace": "Ташкент, Узбекистан",
  "photoUrl": "...",
  "filmography": [
    { "type": "movie", "slug": "ten-samarkanda", "title": "Тень Самарканда", "year": 2024, "role": "actor" }
  ]
}
```

---

### `GET /api/plans`
Тарифы.

**Response:**
```json
[
  {
    "slug": "basic",
    "name": "Базовый",
    "price": 0,
    "priceLabel": "Бесплатно",
    "features": ["С рекламой", "HD качество", "1 устройство"],
    "maxDevices": 1,
    "quality": "HD",
    "isBest": false
  }
]
```

---

### User Actions

#### `GET /api/users/:id/profile`
Профиль + мульти-профили.

#### `GET /api/users/:id/favorites`
Список избранного с контентом.

#### `POST /api/users/:id/favorites`
```json
{ "movieId": "uuid" }
// или
{ "seriesId": "uuid" }
```

#### `DELETE /api/users/:id/favorites/:favoriteId`
Удалить из избранного.

#### `GET /api/users/:id/history?continue=true`
История просмотра. `?continue=true` — только незавершённые (прогресс < 95%).

#### `POST /api/users/:id/history`
```json
{
  "movieId": "uuid",
  "progressSec": 4200,
  "durationSec": 8280
}
```

#### `GET /api/users/:id/notifications`
Уведомления пользователя.

#### `POST /api/users/:id/notifications/:notifId/read`
Пометить прочитанным.

---

## Примеры запросов

```bash
# Главная страница (узбекский)
curl http://localhost:3001/api/home?lang=uz

# Фильмы — триллеры 2024 года, отсортированные по рейтингу
curl "http://localhost:3001/api/movies?genre=thriller&year=2024&sort=rating"

# Детали фильма
curl http://localhost:3001/api/movies/ten-samarkanda

# Детали сериала с эпизодами
curl http://localhost:3001/api/series/kod-tashkent?lang=uz

# Поиск
curl "http://localhost:3001/api/search?q=ташкент"

# Избранное пользователя
curl http://localhost:3001/api/users/{userId}/favorites
```
