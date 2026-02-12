/**
 * Analytics API
 *
 * GET /admin/analytics/overview      — общая статистика
 * GET /admin/analytics/content       — популярный контент
 * GET /admin/analytics/users         — активность пользователей
 * GET /admin/analytics/revenue       — доходы от подписок
 */
import { Hono } from 'hono';
import { eq, desc, sql, and, gte } from 'drizzle-orm';
import {
  movies, series, users, watchHistory, reviews,
  favorites, plans, notifications, episodes,
} from '@makontv/db';
import { getDb } from '../db';
import { adminGuard } from '../middleware/admin';

const analytics = new Hono();
analytics.use('/*', adminGuard);

// ═══ OVERVIEW ═══
analytics.get('/overview', async (c) => {
  const db = getDb();

  const now = new Date();
  const day = new Date(now.getTime() - 24 * 3600 * 1000);
  const week = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
  const month = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

  // Total counts
  const [mc] = await db.select({ c: sql<number>`count(*)` }).from(movies);
  const [sc] = await db.select({ c: sql<number>`count(*)` }).from(series);
  const [uc] = await db.select({ c: sql<number>`count(*)` }).from(users);
  const [ec] = await db.select({ c: sql<number>`count(*)` }).from(episodes);

  // Active users (watched something in last 7 days)
  const activeUsers = await db.selectDistinct({ uid: watchHistory.userId })
    .from(watchHistory)
    .where(gte(watchHistory.watchedAt, week));

  // New users this week
  const newUsers = await db.select({ c: sql<number>`count(*)` }).from(users)
    .where(gte(users.createdAt, week));

  // Subscribers
  const [subs] = await db.select({ c: sql<number>`count(*)` }).from(users)
    .where(eq(users.subscriptionStatus, 'active'));

  // Views today
  const viewsToday = await db.select({ c: sql<number>`count(*)` }).from(watchHistory)
    .where(gte(watchHistory.watchedAt, day));

  // Total watch time (hours)
  const [watchTime] = await db.select({
    total: sql<number>`COALESCE(SUM(${watchHistory.progressSec}), 0)`
  }).from(watchHistory);

  return c.json({
    totals: {
      movies: mc.c,
      series: sc.c,
      episodes: ec.c,
      users: uc.c,
      subscribers: subs.c,
    },
    activity: {
      activeUsersWeek: activeUsers.length,
      newUsersWeek: newUsers[0]?.c || 0,
      viewsToday: viewsToday[0]?.c || 0,
      totalWatchHours: Math.round((watchTime?.total || 0) / 3600),
    },
  });
});

// ═══ POPULAR CONTENT ═══
analytics.get('/content', async (c) => {
  const db = getDb();
  const period = c.req.query('period') || '7d';
  const since = new Date(Date.now() - (period === '30d' ? 30 : period === '24h' ? 1 : 7) * 24 * 3600 * 1000);

  // Most watched movies
  const topMovies = await db.select({
    movieId: watchHistory.movieId,
    views: sql<number>`count(*)`,
    uniqueViewers: sql<number>`count(distinct ${watchHistory.userId})`,
    avgProgress: sql<number>`avg(cast(${watchHistory.progressPct} as numeric))`,
  })
    .from(watchHistory)
    .where(and(
      sql`${watchHistory.movieId} IS NOT NULL`,
      gte(watchHistory.watchedAt, since)
    ))
    .groupBy(watchHistory.movieId)
    .orderBy(sql`count(*) desc`)
    .limit(10);

  // Enrich with movie titles
  const topMoviesEnriched = [];
  for (const tm of topMovies) {
    if (tm.movieId) {
      const [m] = await db.select().from(movies).where(eq(movies.id, tm.movieId));
      if (m) topMoviesEnriched.push({
        title: m.title,
        slug: m.slug,
        rating: m.rating,
        views: tm.views,
        uniqueViewers: tm.uniqueViewers,
        avgCompletion: Math.round(tm.avgProgress || 0),
      });
    }
  }

  // Most favorited
  const topFavorited = await db.select({
    movieId: favorites.movieId,
    count: sql<number>`count(*)`,
  })
    .from(favorites)
    .where(sql`${favorites.movieId} IS NOT NULL`)
    .groupBy(favorites.movieId)
    .orderBy(sql`count(*) desc`)
    .limit(5);

  // Top rated
  const topRated = await db.select().from(movies)
    .where(sql`${movies.ratingCount} > 0`)
    .orderBy(desc(movies.rating))
    .limit(5);

  return c.json({
    period,
    topWatched: topMoviesEnriched,
    topFavorited: topFavorited,
    topRated: topRated.map(m => ({ title: m.title, rating: m.rating, ratingCount: m.ratingCount })),
  });
});

// ═══ USER ANALYTICS ═══
analytics.get('/users', async (c) => {
  const db = getDb();

  // Users by subscription status
  const byStatus = await db.select({
    status: users.subscriptionStatus,
    count: sql<number>`count(*)`,
  })
    .from(users)
    .groupBy(users.subscriptionStatus);

  // Users by plan
  const byPlan = await db.select({
    planId: users.planId,
    count: sql<number>`count(*)`,
  })
    .from(users)
    .groupBy(users.planId);

  // Enrich with plan names
  const byPlanEnriched = [];
  for (const bp of byPlan) {
    if (bp.planId) {
      const [plan] = await db.select().from(plans).where(eq(plans.id, bp.planId));
      byPlanEnriched.push({ plan: plan?.name || bp.planId, count: bp.count });
    } else {
      byPlanEnriched.push({ plan: { ru: 'Без тарифа', uz: 'Tarifsiz' }, count: bp.count });
    }
  }

  // Users by language
  const byLang = await db.select({
    lang: users.language,
    count: sql<number>`count(*)`,
  })
    .from(users)
    .groupBy(users.language);

  // Registration trend (last 30 days, grouped by day)
  const regTrend = await db.select({
    day: sql<string>`date(${users.createdAt})`,
    count: sql<number>`count(*)`,
  })
    .from(users)
    .where(gte(users.createdAt, new Date(Date.now() - 30 * 24 * 3600 * 1000)))
    .groupBy(sql`date(${users.createdAt})`)
    .orderBy(sql`date(${users.createdAt})`);

  return c.json({
    byStatus,
    byPlan: byPlanEnriched,
    byLanguage: byLang,
    registrationTrend: regTrend,
  });
});

// ═══ REVENUE ═══
analytics.get('/revenue', async (c) => {
  const db = getDb();

  // Paid subscribers by plan
  const activeSubs = await db.select({
    planId: users.planId,
    count: sql<number>`count(*)`,
  })
    .from(users)
    .where(eq(users.subscriptionStatus, 'active'))
    .groupBy(users.planId);

  let monthlyRevenue = 0;
  const breakdown = [];

  for (const sub of activeSubs) {
    if (sub.planId) {
      const [plan] = await db.select().from(plans).where(eq(plans.id, sub.planId));
      if (plan && plan.price > 0) {
        const subtotal = plan.price * sub.count;
        monthlyRevenue += subtotal;
        breakdown.push({
          plan: plan.name,
          price: plan.price,
          subscribers: sub.count,
          monthlyTotal: subtotal,
        });
      }
    }
  }

  return c.json({
    monthlyRevenue,
    annualProjected: monthlyRevenue * 12,
    currency: 'UZS',
    breakdown,
  });
});

export default analytics;
