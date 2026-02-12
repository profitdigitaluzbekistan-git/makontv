/**
 * User Actions API v2 — full user lifecycle
 *
 * Extends the base users route with:
 *   - Multi-profile management
 *   - Review submission
 *   - Referral system
 *   - Download tracking
 *   - Notification broadcast
 */
import { Hono } from 'hono';
import { eq, and, desc, sql } from 'drizzle-orm';
import {
  users, userProfiles, favorites, watchHistory,
  notifications, reviews, movies, series, episodes, seasons,
  downloads, referralRewards, plans,
} from '@makontv/db';
import { getDb } from '../db';
import { getLang, localizeObj, type Lang } from '../helpers';

const usersV2 = new Hono();

// ════════════════════════════════
// PROFILES (multi-profile)
// ════════════════════════════════

// GET /api/users/:id/profiles — list all profiles
usersV2.get('/:id/profiles', async (c) => {
  const db = getDb();
  const userId = c.req.param('id');
  const profiles = await db.select().from(userProfiles)
    .where(eq(userProfiles.userId, userId));
  return c.json(profiles);
});

// POST /api/users/:id/profiles — create profile
usersV2.post('/:id/profiles', async (c) => {
  const db = getDb();
  const userId = c.req.param('id');
  const body = await c.req.json<{ name: string; isKids?: boolean; avatarUrl?: string }>();

  // Check max profiles (from user's plan)
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return c.json({ error: 'User not found' }, 404);

  const existing = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));

  let maxProfiles = 1;
  if (user.planId) {
    const [plan] = await db.select().from(plans).where(eq(plans.id, user.planId));
    if (plan) maxProfiles = plan.maxProfiles || 1;
  }

  if (existing.length >= maxProfiles) {
    return c.json({ error: `Максимум ${maxProfiles} профилей на вашем тарифе` }, 403);
  }

  const [profile] = await db.insert(userProfiles).values({
    userId,
    name: body.name,
    isKids: body.isKids || false,
    avatarUrl: body.avatarUrl,
    isDefault: existing.length === 0,
  }).returning();

  return c.json(profile, 201);
});

// PUT /api/users/:id/profiles/:pid — update profile
usersV2.put('/:id/profiles/:pid', async (c) => {
  const db = getDb();
  const pid = c.req.param('pid');
  const body = await c.req.json();
  delete body.id;
  delete body.userId;

  const [updated] = await db.update(userProfiles).set(body)
    .where(eq(userProfiles.id, pid)).returning();
  if (!updated) return c.json({ error: 'Profile not found' }, 404);
  return c.json(updated);
});

// DELETE /api/users/:id/profiles/:pid
usersV2.delete('/:id/profiles/:pid', async (c) => {
  const db = getDb();
  const pid = c.req.param('pid');
  await db.delete(userProfiles).where(eq(userProfiles.id, pid));
  return c.json({ ok: true });
});

// ════════════════════════════════
// REVIEWS
// ════════════════════════════════

// POST /api/users/:id/reviews — submit review
usersV2.post('/:id/reviews', async (c) => {
  const db = getDb();
  const userId = c.req.param('id');
  const body = await c.req.json<{
    movieId?: string;
    seriesId?: string;
    rating: number;
    text?: string;
  }>();

  if (!body.movieId && !body.seriesId) {
    return c.json({ error: 'movieId or seriesId required' }, 400);
  }
  if (!body.rating || body.rating < 1 || body.rating > 5) {
    return c.json({ error: 'rating must be 1-5' }, 400);
  }

  // Check for existing review
  const conditions = [eq(reviews.userId, userId)];
  if (body.movieId) conditions.push(eq(reviews.movieId, body.movieId));
  if (body.seriesId) conditions.push(eq(reviews.seriesId, body.seriesId));

  const existing = await db.select().from(reviews).where(and(...conditions));
  if (existing.length > 0) {
    // Update existing review
    const [updated] = await db.update(reviews).set({
      rating: body.rating,
      text: body.text || null,
    }).where(eq(reviews.id, existing[0].id)).returning();
    return c.json(updated);
  }

  const [review] = await db.insert(reviews).values({
    userId,
    movieId: body.movieId || null,
    seriesId: body.seriesId || null,
    rating: body.rating,
    text: body.text || null,
  }).returning();

  // Update movie/series average rating
  if (body.movieId) {
    const allReviews = await db.select().from(reviews)
      .where(eq(reviews.movieId, body.movieId));
    const avg = allReviews.reduce((s, r) => s + (r.rating || 0), 0) / allReviews.length;
    await db.update(movies).set({
      rating: avg.toFixed(1),
      ratingCount: allReviews.length,
    }).where(eq(movies.id, body.movieId));
  }
  if (body.seriesId) {
    const allReviews = await db.select().from(reviews)
      .where(eq(reviews.seriesId, body.seriesId));
    const avg = allReviews.reduce((s, r) => s + (r.rating || 0), 0) / allReviews.length;
    await db.update(series).set({
      rating: avg.toFixed(1),
      ratingCount: allReviews.length,
    }).where(eq(series.id, body.seriesId));
  }

  return c.json(review, 201);
});

// GET /api/users/:id/reviews — user's reviews
usersV2.get('/:id/reviews', async (c) => {
  const db = getDb();
  const lang = getLang(c);
  const userId = c.req.param('id');

  const userReviews = await db.select().from(reviews)
    .where(eq(reviews.userId, userId))
    .orderBy(desc(reviews.createdAt));

  const result = [];
  for (const r of userReviews) {
    let title = '';
    let type = '';
    if (r.movieId) {
      const [m] = await db.select().from(movies).where(eq(movies.id, r.movieId));
      if (m) { title = localizeObj(m, lang, ['title']).title; type = 'movie'; }
    }
    if (r.seriesId) {
      const [s] = await db.select().from(series).where(eq(series.id, r.seriesId));
      if (s) { title = localizeObj(s, lang, ['title']).title; type = 'series'; }
    }
    result.push({ ...r, contentTitle: title, contentType: type });
  }

  return c.json(result);
});

// ════════════════════════════════
// REFERRAL
// ════════════════════════════════

// GET /api/users/:id/referral — referral info
usersV2.get('/:id/referral', async (c) => {
  const db = getDb();
  const userId = c.req.param('id');

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return c.json({ error: 'User not found' }, 404);

  // Count referrals
  const referred = await db.select().from(users).where(eq(users.referredBy, userId));

  // Rewards
  const rewards = await db.select().from(referralRewards)
    .where(eq(referralRewards.referrerId, userId))
    .orderBy(desc(referralRewards.createdAt));

  const totalDays = rewards
    .filter(r => r.status === 'granted')
    .reduce((sum, r) => sum + (r.rewardDays || 0), 0);

  return c.json({
    referralCode: user.referralCode || '',
    referralLink: `https://makontv.uz/ref/${user.referralCode || ''}`,
    invitedCount: referred.length,
    rewardDaysTotal: totalDays,
    rewards,
  });
});

// POST /api/users/:id/referral/apply — apply referral code
usersV2.post('/:id/referral/apply', async (c) => {
  const db = getDb();
  const userId = c.req.param('id');
  const body = await c.req.json<{ code: string }>();

  if (!body.code) return c.json({ error: 'code required' }, 400);

  // Find referrer
  const [referrer] = await db.select().from(users).where(eq(users.referralCode, body.code));
  if (!referrer) return c.json({ error: 'Неверный реферальный код' }, 404);
  if (referrer.id === userId) return c.json({ error: 'Нельзя использовать свой код' }, 400);

  // Check if already referred
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (user?.referredBy) return c.json({ error: 'Реферальный код уже использован' }, 400);

  // Apply
  await db.update(users).set({ referredBy: referrer.id }).where(eq(users.id, userId));

  // Grant reward to referrer
  await db.insert(referralRewards).values({
    referrerId: referrer.id,
    referredId: userId,
    rewardDays: 7,
    status: 'granted',
  });

  return c.json({ ok: true, message: '+7 дней Premium для пригласившего' });
});

// ════════════════════════════════
// DOWNLOADS (metadata tracking)
// ════════════════════════════════

// GET /api/users/:id/downloads
usersV2.get('/:id/downloads', async (c) => {
  const db = getDb();
  const lang = getLang(c);
  const userId = c.req.param('id');

  const items = await db.select().from(downloads)
    .where(eq(downloads.userId, userId))
    .orderBy(desc(downloads.downloadedAt));

  const result = [];
  for (const d of items) {
    let content: any = null;
    if (d.movieId) {
      const [m] = await db.select().from(movies).where(eq(movies.id, d.movieId));
      if (m) content = { type: 'movie', ...localizeObj(m, lang, ['title']), fileSize: d.fileSize };
    }
    if (d.episodeId) {
      const [ep] = await db.select().from(episodes).where(eq(episodes.id, d.episodeId));
      if (ep) {
        const [sn] = await db.select().from(seasons).where(eq(seasons.id, ep.seasonId));
        let seriesTitle = '';
        if (sn) {
          const [show] = await db.select().from(series).where(eq(series.id, sn.seriesId));
          if (show) seriesTitle = localizeObj(show, lang, ['title']).title;
        }
        content = {
          type: 'episode',
          ...localizeObj(ep, lang, ['title']),
          seriesTitle,
          seasonNumber: sn?.number,
          fileSize: d.fileSize,
        };
      }
    }
    if (content) result.push({ ...content, downloadedAt: d.downloadedAt, downloadId: d.id });
  }

  return c.json(result);
});

// POST /api/users/:id/downloads — track download
usersV2.post('/:id/downloads', async (c) => {
  const db = getDb();
  const userId = c.req.param('id');
  const body = await c.req.json<{ movieId?: string; episodeId?: string; fileSize?: number }>();

  const [dl] = await db.insert(downloads).values({
    userId,
    movieId: body.movieId || null,
    episodeId: body.episodeId || null,
    fileSize: body.fileSize || 0,
  }).returning();

  return c.json(dl, 201);
});

// DELETE /api/users/:id/downloads/:did
usersV2.delete('/:id/downloads/:did', async (c) => {
  const db = getDb();
  const did = c.req.param('did');
  await db.delete(downloads).where(eq(downloads.id, did));
  return c.json({ ok: true });
});

// ════════════════════════════════
// NOTIFICATION: broadcast (send to all users)
// ════════════════════════════════

// POST /api/notifications/broadcast (admin only, checked by header)
usersV2.post('/broadcast/notifications', async (c) => {
  const db = getDb();
  const secret = c.req.header('X-Admin-Secret');
  const expected = process.env.ADMIN_SECRET || 'changeme-makontv-admin-2025';
  if (secret !== expected) return c.json({ error: 'Unauthorized' }, 401);

  const body = await c.req.json<{
    type: string;
    title: { ru: string; uz: string };
    body?: { ru: string; uz: string };
    iconType?: string;
    actionUrl?: string;
  }>();

  // Get all non-blocked users
  const allUsers = await db.select({ id: users.id }).from(users)
    .where(eq(users.isBlocked, false));

  // Create notification for each user
  let count = 0;
  for (const u of allUsers) {
    await db.insert(notifications).values({
      userId: u.id,
      type: body.type,
      title: body.title,
      body: body.body || {},
      iconType: body.iconType,
      actionUrl: body.actionUrl,
    });
    count++;
  }

  return c.json({ ok: true, sentTo: count });
});

export default usersV2;
