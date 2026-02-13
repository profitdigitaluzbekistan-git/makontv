/**
 * MakonTV API Application
 *
 * Hono app definition — shared between local server and Vercel serverless.
 */
import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authRateLimit, apiRateLimit, searchRateLimit } from './middleware/rateLimit';
import { getDb } from './db';
import { genres, notifications } from '@makontv/db';
import { desc, isNull } from 'drizzle-orm';

// Routes
import homeRoute from './routes/home';
import genresRoute from './routes/genres';
import moviesRoute from './routes/movies';
import seriesRoute from './routes/series';
import searchRoute from './routes/search';
import personsRoute from './routes/persons';
import plansRoute from './routes/plans';
import usersRoute from './routes/users';
import usersV2Route from './routes/usersV2';
import authRoute from './routes/auth';
import subscriptionsRoute from './routes/subscriptions';
import adminRoute from './routes/admin';
import uploadRoute from './routes/upload';
import analyticsRoute from './routes/analytics';

const app = new Hono();

// ═══ MIDDLEWARE ═══
app.use('/*', logger());
app.use('/*', cors({
  origin: (origin) => origin || '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Admin-Secret'],
}));

// ═══ HEALTH ═══
app.get('/', (c) => c.json({
  service: 'MakonTV API',
  version: '2.0.0',
  status: 'ok',
  timestamp: new Date().toISOString(),
  docs: '/api',
}));

app.get('/health', async (c) => {
  try {
    const db = getDb();
    const result = await db.select().from(genres).limit(1);
    return c.json({ status: 'ok', db: 'connected' });
  } catch (err: any) {
    return c.json({ status: 'error', db: 'disconnected', error: err.message }, 500);
  }
});

// ═══ API DOCS ═══
app.get('/api', (c) => c.json({
  endpoints: {
    'GET /api/home':                        'Главная: hero + подборки',
    'GET /api/genres':                      'Жанры',
    'GET /api/movies':                      'Каталог фильмов (?genre=&year=&quality=&sort=&page=&limit=)',
    'GET /api/movies/:slug':                'Детали фильма (каст, жанры, похожие, отзывы)',
    'GET /api/series':                      'Каталог сериалов (?genre=&year=&sort=&page=&limit=)',
    'GET /api/series/:slug':                'Детали сериала (сезоны, эпизоды, каст)',
    'GET /api/search?q=':                   'Поиск по фильмам, сериалам, актёрам',
    'GET /api/persons/:id':                 'Актёр: био + фильмография',
    'GET /api/plans':                       'Тарифы',
    'GET /api/users/:id/profile':           'Профиль пользователя',
    'GET /api/users/:id/favorites':         'Избранное',
    'POST /api/users/:id/favorites':        'Добавить в избранное',
    'DELETE /api/users/:id/favorites/:fid': 'Удалить из избранного',
    'GET /api/users/:id/history':           'История просмотра (?continue=true)',
    'POST /api/users/:id/history':          'Обновить прогресс',
    'GET /api/users/:id/notifications':     'Уведомления',
    'POST /api/users/:id/notifications/:nid/read': 'Пометить прочитанным',
  },
  i18n: 'Добавьте ?lang=uz к любому GET-запросу для узбекского языка. По умолчанию: ru.',
}));

// ═══ PUBLIC NOTIFICATIONS (global, userId is null) ═══
app.get('/api/notifications', async (c) => {
  const db = getDb();
  const notifs = await db.select().from(notifications)
    .where(isNull(notifications.userId))
    .orderBy(desc(notifications.createdAt))
    .limit(20);
  return c.json(notifs);
});

// ═══ ROUTES ═══
app.use('/api/auth/*', authRateLimit);
app.use('/api/search', searchRateLimit);
app.route('/api/home', homeRoute);
app.route('/api/genres', genresRoute);
app.route('/api/movies', moviesRoute);
app.route('/api/series', seriesRoute);
app.route('/api/search', searchRoute);
app.route('/api/persons', personsRoute);
app.route('/api/plans', plansRoute);
app.route('/api/users', usersRoute);
app.route('/api/users', usersV2Route);
app.route('/api/auth', authRoute);
app.route('/api/subscriptions', subscriptionsRoute);
app.route('/admin', adminRoute);
app.route('/admin/upload', uploadRoute);
app.route('/admin/analytics', analyticsRoute);

// ═══ 404 ═══
app.notFound((c) => c.json({ error: 'Not found', path: c.req.path }, 404));

// ═══ ERROR HANDLER ═══
app.onError((err, c) => {
  console.error('API Error:', err);
  return c.json({ error: 'Internal server error', message: err.message }, 500);
});

export default app;
