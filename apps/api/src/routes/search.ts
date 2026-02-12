/**
 * GET /api/search?q=текст&lang=ru
 *
 * Ищет по title (JSONB) в movies, series и по name в persons.
 * Возвращает объединённые результаты с типом.
 */
import { Hono } from 'hono';
import { eq, sql, and } from 'drizzle-orm';
import { movies, series, persons } from '@makontv/db';
import { getDb } from '../db';
import { getLang, localizeObj, type Lang } from '../helpers';

const searchRoute = new Hono();

searchRoute.get('/', async (c) => {
  const db = getDb();
  const lang = getLang(c);
  const q = (c.req.query('q') || '').trim().toLowerCase();

  if (!q || q.length < 2) {
    return c.json({ results: [], query: q });
  }

  // Search movies by title (JSONB → text search)
  // Uses JSONB ->> 'ru' ILIKE '%query%' OR ->> 'uz' ILIKE '%query%'
  const movieResults = await db.select().from(movies).where(
    and(
      eq(movies.isPublished, true),
      sql`(${movies.title}->>'ru' ILIKE ${'%' + q + '%'} OR ${movies.title}->>'uz' ILIKE ${'%' + q + '%'})`
    )
  ).limit(10);

  const seriesResults = await db.select().from(series).where(
    and(
      eq(series.isPublished, true),
      sql`(${series.title}->>'ru' ILIKE ${'%' + q + '%'} OR ${series.title}->>'uz' ILIKE ${'%' + q + '%'})`
    )
  ).limit(10);

  const personResults = await db.select().from(persons).where(
    sql`(${persons.name}->>'ru' ILIKE ${'%' + q + '%'} OR ${persons.name}->>'uz' ILIKE ${'%' + q + '%'})`
  ).limit(5);

  const results = [
    ...movieResults.map(m => ({
      type: 'movie' as const,
      id: m.id,
      slug: m.slug,
      title: localizeObj(m, lang, ['title']).title,
      year: m.year,
      rating: m.rating,
      posterUrl: m.posterUrl,
    })),
    ...seriesResults.map(s => ({
      type: 'series' as const,
      id: s.id,
      slug: s.slug,
      title: localizeObj(s, lang, ['title']).title,
      year: s.year,
      rating: s.rating,
      posterUrl: s.posterUrl,
    })),
    ...personResults.map(p => ({
      type: 'person' as const,
      id: p.id,
      name: localizeObj(p, lang, ['name']).name,
      photoUrl: p.photoUrl,
    })),
  ];

  return c.json({ results, query: q, total: results.length });
});

export default searchRoute;
