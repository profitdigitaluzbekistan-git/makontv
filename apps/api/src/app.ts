/**
 * MakonTV API Application
 *
 * Hono app definition — shared between local server and Vercel serverless.
 */
import 'dotenv/config';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { authRateLimit, apiRateLimit, searchRateLimit } from './middleware/rateLimit';
import { getDb } from './db';
import { genres, notifications, reviews, users, movies, series, episodes } from '@makontv/db';
import { desc, isNull, eq, and, or, sql } from 'drizzle-orm';
import { authRequired, authOptional } from './middleware/auth';

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
import promoRoute from './routes/promo';

const app = new Hono();

// ═══ CORS ═══
const ALLOWED_ORIGINS = [
  'https://makontv-admin-panel.vercel.app',
  'https://makontv-web.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:3001',
];

function isAllowedOrigin(origin: string | undefined): string | null {
  if (!origin) return null;
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  if (origin.endsWith('.vercel.app')) return origin;
  return null;
}

function setCorsHeaders(c: any, origin: string | undefined) {
  const allowed = isAllowedOrigin(origin);
  c.header('Vary', 'Origin');
  if (allowed) {
    c.header('Access-Control-Allow-Origin', allowed);
    c.header('Access-Control-Allow-Credentials', 'true');
  } else {
    c.header('Access-Control-Allow-Origin', '*');
  }
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Secret');
  c.header('Access-Control-Expose-Headers', 'x-total-count');
}

app.use('/*', async (c, next) => {
  const origin = c.req.header('Origin');

  // Handle preflight
  if (c.req.method === 'OPTIONS') {
    c.status(204);
    setCorsHeaders(c, origin);
    c.header('Access-Control-Max-Age', '600');
    return c.body(null);
  }

  try {
    await next();
  } finally {
    // Always set CORS headers, even if handler threw
    setCorsHeaders(c, origin);
  }
});

// ═══ MIDDLEWARE ═══
app.use('/*', logger());

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

// ═══ PUBLIC VIDEO ACCESS (with auth + subscription check) ═══
app.get('/api/video/:id', authRequired, async (c) => {
  const db = getDb();
  const userId = c.get('userId') as string;
  const contentId = c.req.param('id');
  const type = c.req.query('type') || 'movie'; // movie or episode

  // Check user subscription status
  const [user] = await db.select({
    subscriptionStatus: users.subscriptionStatus,
    subscriptionExpiresAt: users.subscriptionExpiresAt,
  }).from(users).where(eq(users.id, userId)).limit(1);

  if (!user) return c.json({ error: 'Пользователь не найден' }, 404);

  let videoUrl: string | null = null;
  let videoType: string | null = null;
  let isPremium = false;

  if (type === 'episode') {
    const [ep] = await db.select({
      videoUrl: episodes.videoUrl,
      videoType: episodes.videoType,
      isFree: episodes.isFree,
    }).from(episodes).where(eq(episodes.id, contentId)).limit(1);
    if (!ep) return c.json({ error: 'Эпизод не найден' }, 404);
    videoUrl = ep.videoUrl;
    videoType = ep.videoType;
    isPremium = !ep.isFree;
  } else {
    const [movie] = await db.select({
      videoUrl: movies.videoUrl,
      videoType: movies.videoType,
      isPremium: movies.isPremium,
    }).from(movies).where(eq(movies.id, contentId)).limit(1);
    if (!movie) return c.json({ error: 'Фильм не найден' }, 404);
    videoUrl = movie.videoUrl;
    videoType = movie.videoType;
    isPremium = movie.isPremium || false;
  }

  // Premium content check
  if (isPremium) {
    const isActive = user.subscriptionStatus === 'active' &&
      user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) > new Date();
    if (!isActive) {
      return c.json({
        error: 'Требуется подписка',
        code: 'SUBSCRIPTION_REQUIRED',
        message: 'Оформите подписку для просмотра этого контента',
      }, 403);
    }
  }

  if (!videoUrl) {
    return c.json({ error: 'Видео недоступно', code: 'NO_VIDEO' }, 404);
  }

  // If it's a Bunny Stream video ID (UUID format), build HLS URL
  const cdnHostname = process.env.BUNNY_STREAM_CDN_HOST;
  if (cdnHostname && videoType === 'bunny') {
    return c.json({
      url: `https://${cdnHostname}/${videoUrl}/playlist.m3u8`,
      type: 'hls',
      videoId: videoUrl,
    });
  }

  // For HLS URLs
  if (videoType === 'hls' || videoUrl.includes('.m3u8')) {
    return c.json({ url: videoUrl, type: 'hls' });
  }

  // For YouTube
  if (videoType === 'youtube' || videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
    return c.json({ url: videoUrl, type: 'youtube' });
  }

  // Direct URL
  return c.json({ url: videoUrl, type: 'url' });
});

// ═══ PUBLIC NOTIFICATIONS (global, userId is null) ═══
app.get('/api/notifications', async (c) => {
  const db = getDb();
  const notifs = await db.select().from(notifications)
    .where(isNull(notifications.userId))
    .orderBy(desc(notifications.createdAt))
    .limit(20);
  return c.json(notifs);
});

// ═══ PUBLIC REVIEWS ═══
// GET reviews — returns approved reviews + user's own pending review
app.get('/api/reviews', authOptional, async (c) => {
  const db = getDb();
  const type = c.req.query('type');
  const id = c.req.query('id');
  if (!type || !id) return c.json({ reviews: [], avgRating: 0, totalCount: 0 });

  const contentCondition = type === 'movie' ? eq(reviews.movieId, id) : eq(reviews.seriesId, id);
  const userId = c.get('userId') as string | undefined;

  // Get approved reviews
  const approvedRows = await db.select({
    id: reviews.id, rating: reviews.rating, text: reviews.text,
    createdAt: reviews.createdAt, status: reviews.status,
    userId: reviews.userId, userName: users.name,
  }).from(reviews)
    .leftJoin(users, eq(reviews.userId, users.id))
    .where(and(contentCondition, eq(reviews.status, 'approved')))
    .orderBy(desc(reviews.createdAt))
    .limit(50);

  // Get user's own review if pending/rejected (not yet approved)
  let myReview = null;
  if (userId) {
    const [own] = await db.select({
      id: reviews.id, rating: reviews.rating, text: reviews.text,
      createdAt: reviews.createdAt, status: reviews.status,
      userId: reviews.userId, userName: users.name,
    }).from(reviews)
      .leftJoin(users, eq(reviews.userId, users.id))
      .where(and(contentCondition, eq(reviews.userId, userId), sql`${reviews.status} != 'approved'`))
      .limit(1);
    if (own) {
      const n = own.userName as any;
      myReview = { ...own, userName: n ? (typeof n === 'object' ? (n.ru || n.uz || '') : String(n)) : 'Пользователь' };
    }
  }

  // Calculate average rating from approved reviews
  const ratings = approvedRows.filter(r => r.rating).map(r => r.rating!);
  const avgRating = ratings.length > 0 ? parseFloat((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)) : 0;

  const fmtName = (n: any) => n ? (typeof n === 'object' ? (n.ru || n.uz || '') : String(n)) : 'Пользователь';
  return c.json({
    reviews: approvedRows.map(r => ({ ...r, userName: fmtName(r.userName) || 'Пользователь' })),
    myReview,
    avgRating,
    totalCount: approvedRows.length,
  });
});

// POST review — requires auth, one per user per content, status: pending
app.post('/api/reviews', authRequired, async (c) => {
  const db = getDb();
  const userId = c.get('userId') as string;
  const body = await c.req.json();

  const movieId = body.movieId || null;
  const seriesId = body.seriesId || null;
  if (!movieId && !seriesId) return c.json({ error: 'Укажите movieId или seriesId' }, 400);

  const rating = parseInt(body.rating);
  if (!rating || rating < 1 || rating > 5) return c.json({ error: 'Оценка от 1 до 5' }, 400);

  // Check for duplicate review
  const contentCondition = movieId ? eq(reviews.movieId, movieId) : eq(reviews.seriesId, seriesId!);
  const [existing] = await db.select({ id: reviews.id, status: reviews.status })
    .from(reviews)
    .where(and(eq(reviews.userId, userId), contentCondition))
    .limit(1);

  if (existing) {
    // Update existing review
    const [updated] = await db.update(reviews).set({
      rating,
      text: body.text || '',
      status: 'pending',
      updatedAt: new Date(),
    }).where(eq(reviews.id, existing.id)).returning();
    return c.json({ review: updated, message: 'Отзыв обновлён и отправлен на модерацию' });
  }

  // Create new review
  const [review] = await db.insert(reviews).values({
    userId,
    movieId,
    seriesId,
    rating,
    text: body.text || '',
    status: 'pending',
  }).returning();

  return c.json({ review, message: 'Отзыв отправлен на модерацию' }, 201);
});

// ═══ ROUTES ═══
// Rate limit only login/register endpoints, not profile/me/avatar/refresh
app.use('/api/auth/login', authRateLimit);
app.use('/api/auth/register', authRateLimit);
app.use('/api/auth/google', authRateLimit);
app.use('/api/auth/firebase', authRateLimit);
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
app.route('/api/promo', promoRoute);
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
