# MakonTV — Настройка хранилища (Storage)

## Cloudflare R2 (рекомендуется)

### Почему R2

- **$0 за egress** — трафик выдачи файлов бесплатный (у S3 это основная статья расходов)
- **10 GB бесплатно** — достаточно для старта
- **S3-совместимый** — работает с любым S3 SDK
- **Встроенный CDN** — через R2 Public Access или Cloudflare CDN

### Шаги настройки

#### 1. Создать аккаунт

Зарегистрируйтесь на [dash.cloudflare.com](https://dash.cloudflare.com).

#### 2. Создать R2 bucket

- Перейдите: R2 Object Storage → Create bucket
- Имя: `makontv`
- Регион: Automatic

#### 3. Включить Public Access

- Откройте bucket → Settings → Public Access
- Включите "Allow Access"
- Скопируйте Public URL: `https://pub-xxxxx.r2.dev`

#### 4. Создать API Token

- R2 → Manage R2 API Tokens → Create API Token
- Permissions: Object Read & Write
- Скопируйте:
  - Access Key ID → `S3_ACCESS_KEY`
  - Secret Access Key → `S3_SECRET_KEY`

#### 5. Найти Account ID

- В дашборде справа: Account ID
- Endpoint: `https://{ACCOUNT_ID}.r2.cloudflarestorage.com`

#### 6. Заполнить .env

```env
S3_ENDPOINT=https://abc123def456.r2.cloudflarestorage.com
S3_BUCKET=makontv
S3_ACCESS_KEY=your_key_here
S3_SECRET_KEY=your_secret_here
S3_REGION=auto
S3_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

### CORS (для presigned upload из браузера)

В R2 bucket → Settings → CORS Policy:

```json
[
  {
    "AllowedOrigins": ["http://localhost:5173", "http://localhost:3000", "https://your-domain.com"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

---

## Структура файлов в bucket

```
makontv/
├── posters/       ← постеры фильмов/сериалов (JPEG/WebP, до 10MB)
├── backdrops/     ← фоны для hero-секции
├── thumbnails/    ← превью эпизодов
├── avatars/       ← фото актёров, аватары пользователей
├── videos/        ← видео файлы (MP4, до 2GB)
└── trailers/      ← трейлеры
```

---

## API Endpoints

| Endpoint | Метод | Описание |
|----------|-------|----------|
| `/admin/upload` | POST | Загрузить файл (multipart/form-data) |
| `/admin/upload/presign` | POST | Получить presigned URL для прямой загрузки в R2 |
| `/admin/upload/:folder/:filename` | DELETE | Удалить файл |
| `/admin/upload/list/:folder` | GET | Список файлов в папке |

### Пример: загрузка постера

```bash
curl -X POST http://localhost:3001/admin/upload \
  -H "X-Admin-Secret: your-secret" \
  -F "file=@poster.jpg" \
  -F "folder=posters"
```

### Пример: presigned upload (для видео)

```bash
# 1. Получить URL
curl -X POST http://localhost:3001/admin/upload/presign \
  -H "X-Admin-Secret: your-secret" \
  -H "Content-Type: application/json" \
  -d '{"filename":"movie.mp4","contentType":"video/mp4","folder":"videos"}'

# Ответ: { "uploadUrl": "https://...", "publicUrl": "https://pub-xxx.r2.dev/videos/abc.mp4" }

# 2. Загрузить файл напрямую в R2
curl -X PUT "UPLOAD_URL_FROM_STEP_1" \
  -H "Content-Type: video/mp4" \
  --data-binary @movie.mp4
```

---

## Видео: стратегия по этапам

### Сейчас (Этап 6)
- **YouTube/Vimeo URL** — вставляете ссылку, фронт рендерит iframe
- **Прямая ссылка** — MP4 файл по URL, фронт играет через `<video>`
- **Upload в R2** — загрузка MP4 через админку, CDN отдаёт файл

### Будущее (Этап 8+)
- **Cloudflare Stream** — HLS, adaptive bitrate, автотранскодинг
- **Mux** — DRM, analytics, thumbnails из видео
- Оба варианта подключаются через замену `videoUrl` → stream URL

---

## Альтернативы R2

| Сервис | Бесплатно | Egress | Примечание |
|--------|-----------|--------|------------|
| **Cloudflare R2** | 10 GB | $0 | ✅ Рекомендуется |
| Supabase Storage | 1 GB | $0.09/GB | Если уже на Supabase |
| AWS S3 | 5 GB | $0.09/GB | Дороже для видео |
| MinIO (self-hosted) | ∞ | $0 | Нужен свой сервер |
| Backblaze B2 | 10 GB | $0 (через CF) | Хорошая альтернатива |
