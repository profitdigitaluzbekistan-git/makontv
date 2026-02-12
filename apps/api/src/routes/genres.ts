/**
 * GET /api/genres — список всех жанров
 * Query: ?lang=ru|uz
 */
import { Hono } from 'hono';
import { genres } from '@makontv/db';
import { getDb } from '../db';
import { getLang, localizeObj } from '../helpers';

const genresRoute = new Hono();

genresRoute.get('/', async (c) => {
  const db = getDb();
  const lang = getLang(c);

  const result = await db.select().from(genres).orderBy(genres.sortOrder);
  return c.json(result.map(g => localizeObj(g, lang, ['name'])));
});

export default genresRoute;
