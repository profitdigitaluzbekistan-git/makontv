/**
 * User Actions API (без auth — по userId в URL)
 *
 * GET    /api/users/:id/favorites          — список избранного
 * POST   /api/users/:id/favorites          — добавить в избранное
 * DELETE /api/users/:id/favorites/:fid     — удалить из избранного
 *
 * GET    /api/users/:id/history            — история просмотра (continue watching)
 * POST   /api/users/:id/history            — обновить прогресс
 *
 * GET    /api/users/:id/notifications      — уведомления
 * POST   /api/users/:id/notifications/:nid/read — пометить прочитанным
 *
 * GET    /api/users/:id/profile            — профиль пользователя
 */
import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import {
  users, userProfiles, favorites, watchHistory,
  notifications, movies, series, episodes, seasons,
} from '@makontv/db';
import { getDb } from '../db';
import { getLang, localizeObj, type Lang } from '../helpers';

const usersRoute = new Hono();

// ═══ PROFILE ═══
usersRoute.get('/:id/profile', async (c) => {
  const db = getDb();
  const lang = getLang(c);
  const id = c.req.param('id');

  const [user] = await db.select().from(users).where(eq(users.id, id));
  if (!user) return c.json({ error: 'User not found' }, 404);

  const profiles = await db.select().from(userProfiles).where(eq(userProfiles.userId, id));

  return c.json({
    ...localizeObj(user, lang, ['name']),
    profiles,
  });
});

// ═══ FAVORITES ═══
usersRoute.get('/:id/favorites', async (c) => {
  const db = getDb();
  const lang = getLang(c);
  const userId = c.req.param('id');

  const favs = await db.select().from(favorites)
    .where(eq(favorites.userId, userId))
    .orderBy(desc(favorites.createdAt));

  const result = [];
  for (const fav of favs) {
    if (fav.movieId) {
      const [m] = await db.select().from(movies).where(eq(movies.id, fav.movieId));
      if (m) result.push({ favoriteId: fav.id, type: 'movie', ...localizeObj(m, lang, ['title', 'shortDesc']) });
    }
    if (fav.seriesId) {
      const [s] = await db.select().from(series).where(eq(series.id, fav.seriesId));
      if (s) result.push({ favoriteId: fav.id, type: 'series', ...localizeObj(s, lang, ['title', 'shortDesc']) });
    }
  }

  return c.json(result);
});

usersRoute.post('/:id/favorites', async (c) => {
  const db = getDb();
  const userId = c.req.param('id');
  const body = await c.req.json<{ movieId?: string; seriesId?: string }>();

  if (!body.movieId && !body.seriesId) {
    return c.json({ error: 'movieId or seriesId required' }, 400);
  }

  const [fav] = await db.insert(favorites).values({
    userId,
    movieId: body.movieId || null,
    seriesId: body.seriesId || null,
  }).returning();

  return c.json(fav, 201);
});

usersRoute.delete('/:id/favorites/:fid', async (c) => {
  const db = getDb();
  const fid = c.req.param('fid');

  await db.delete(favorites).where(eq(favorites.id, fid));
  return c.json({ ok: true });
});

// ═══ WATCH HISTORY / CONTINUE WATCHING ═══
usersRoute.get('/:id/history', async (c) => {
  const db = getDb();
  const lang = getLang(c);
  const userId = c.req.param('id');
  const onlyContinue = c.req.query('continue') === 'true';

  let historyItems = await db.select().from(watchHistory)
    .where(eq(watchHistory.userId, userId))
    .orderBy(desc(watchHistory.watchedAt));

  // If ?continue=true, only items with progress < 95%
  if (onlyContinue) {
    historyItems = historyItems.filter(h => parseFloat(String(h.progressPct)) < 95);
  }

  const result = [];
  for (const h of historyItems) {
    let content: any = null;
    if (h.movieId) {
      const [m] = await db.select().from(movies).where(eq(movies.id, h.movieId));
      if (m) content = { type: 'movie', ...localizeObj(m, lang, ['title']) };
    }
    if (h.episodeId) {
      const [ep] = await db.select().from(episodes).where(eq(episodes.id, h.episodeId));
      if (ep) {
        const [sn] = await db.select().from(seasons).where(eq(seasons.id, ep.seasonId));
        let showTitle = '';
        if (sn) {
          const [show] = await db.select().from(series).where(eq(series.id, sn.seriesId));
          if (show) showTitle = localizeObj(show, lang, ['title']).title;
        }
        content = {
          type: 'episode',
          ...localizeObj(ep, lang, ['title']),
          seriesTitle: showTitle,
          seasonNumber: sn?.number,
        };
      }
    }
    if (content) {
      result.push({
        ...content,
        progressSec: h.progressSec,
        durationSec: h.durationSec,
        progressPct: h.progressPct,
        watchedAt: h.watchedAt,
      });
    }
  }

  return c.json(result);
});

usersRoute.post('/:id/history', async (c) => {
  const db = getDb();
  const userId = c.req.param('id');
  const body = await c.req.json<{
    movieId?: string;
    episodeId?: string;
    progressSec: number;
    durationSec: number;
  }>();

  const progressPct = body.durationSec > 0
    ? ((body.progressSec / body.durationSec) * 100).toFixed(2)
    : '0';

  const [entry] = await db.insert(watchHistory).values({
    userId,
    movieId: body.movieId || null,
    episodeId: body.episodeId || null,
    progressSec: body.progressSec,
    durationSec: body.durationSec,
    progressPct,
  }).returning();

  return c.json(entry, 201);
});

// ═══ NOTIFICATIONS ═══
usersRoute.get('/:id/notifications', async (c) => {
  const db = getDb();
  const lang = getLang(c);
  const userId = c.req.param('id');

  const notifs = await db.select().from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt));

  return c.json(notifs.map(n => localizeObj(n, lang, ['title', 'body'])));
});

usersRoute.post('/:id/notifications/:nid/read', async (c) => {
  const db = getDb();
  const nid = c.req.param('nid');

  await db.update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.id, nid));

  return c.json({ ok: true });
});

export default usersRoute;
