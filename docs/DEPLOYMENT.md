# MakonTV — Production Deployment Guide

## Архитектура в production

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Netlify/     │    │ Vercel/      │    │ Neon         │
│ Vercel       │───▶│ Railway/     │───▶│ Postgres     │
│ (frontend)   │    │ Fly.io (API) │    │ (serverless) │
└─────────────┘    └──────┬───────┘    └─────────────┘
                          │
                   ┌──────▼───────┐
                   │ Cloudflare   │
                   │ R2 (storage) │
                   └──────────────┘
```

## Вариант A: Vercel + Neon (рекомендуется для старта)

### 1. Neon Database

- Уже настроена (Этап 2)
- Production branch: `main`
- Staging branch: `dev` (для тестов)

### 2. API на Vercel

```bash
cd makontv
npx vercel --prod

# Установить env vars:
vercel env add DATABASE_URL production
vercel env add JWT_SECRET production        # openssl rand -hex 32
vercel env add JWT_REFRESH_SECRET production # openssl rand -hex 32
vercel env add ADMIN_SECRET production
vercel env add S3_ENDPOINT production
vercel env add S3_BUCKET production
vercel env add S3_ACCESS_KEY production
vercel env add S3_SECRET_KEY production
vercel env add S3_PUBLIC_URL production
```

### 3. Frontend на Netlify

```bash
cd apps/web/public
# Netlify: Build command: (none, static files)
# Publish directory: apps/web/public
# Environment: MAKONTV_API_URL = https://makontv-api.vercel.app
```

В `index.html` обновить:
```js
window.MAKONTV_API_URL = 'https://makontv-api.vercel.app';
```

### 4. Admin на Vercel (отдельный проект)

```bash
cd apps/admin
npx vercel --prod
```

## Вариант B: Docker (Railway / Fly.io)

### Railway

```bash
# Установить Railway CLI
npm i -g @railway/cli

railway login
railway init
railway up

# Env vars через дашборд Railway
```

### Fly.io

```bash
fly launch --name makontv-api
fly secrets set DATABASE_URL="postgresql://..."
fly secrets set JWT_SECRET="..."
fly deploy
```

### Docker Compose (self-hosted)

```yaml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3001:3001"
    env_file: .env
    restart: unless-stopped
    
  admin:
    build:
      context: .
      dockerfile: apps/admin/Dockerfile
    ports:
      - "5173:80"
    restart: unless-stopped
```

## Чеклист перед деплоем

### Безопасность
- [ ] `JWT_SECRET` — случайная строка 64+ символов (`openssl rand -hex 32`)
- [ ] `JWT_REFRESH_SECRET` — другая случайная строка
- [ ] `ADMIN_SECRET` — сменить с дефолтного
- [ ] CORS origins — только ваши домены
- [ ] HTTPS для всех сервисов

### Производительность
- [ ] Neon: включить connection pooling
- [ ] R2: включить CDN (Cache-Control headers)
- [ ] Vercel: Edge Functions (если перейти на Hono Workers)

### Мониторинг
- [ ] `/health` endpoint — для uptime monitoring
- [ ] Vercel Analytics / Railway Metrics
- [ ] Sentry для error tracking (добавить `@sentry/node`)

### DNS
```
makontv.uz          → Netlify (frontend)
api.makontv.uz      → Vercel/Railway (API)
admin.makontv.uz    → Vercel (admin panel)
cdn.makontv.uz      → Cloudflare R2 (CNAME to pub-xxx.r2.dev)
```

## Генерация секретов

```bash
# JWT Secret
openssl rand -hex 32
# → e.g. a4f8c2d1e6b9...

# Admin Secret
openssl rand -hex 16
# → e.g. 7c3a9b1d...

# Referral salt (optional)
openssl rand -hex 8
```

## Стоимость production

| Сервис | Free tier | Платный |
|--------|-----------|---------|
| Neon Postgres | 512MB, 1 branch | $19/mo (10GB) |
| Vercel | 100GB bandwidth | $20/mo |
| Netlify | 100GB bandwidth | $19/mo |
| Cloudflare R2 | 10GB storage | $0.015/GB |
| **Итого** | **$0** | **~$58/mo** |

Для старта всё умещается в бесплатные тиры.
