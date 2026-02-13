/**
 * GET /api/home — данные для главной страницы
 *
 * Возвращает: hero (featured), и все подборки (collections) с контентом.
 * Query: ?lang=ru|uz
 */
import { Hono } from 'hono';
import { eq, desc, and } from 'drizzle-orm';
import {
  movies, series, collections, collectionItems,
  movieGenres, seriesGenres, genres,
} from '@makontv/db';
import { getDb } from '../db';
import { getLang, localizeObj, type Lang } from '../helpers';

const home = new Hono();

// Localize a movie record
function locMovie(m: any, lang: Lang) {
  return localizeObj(m, lang, ['title', 'description', 'shortDesc', 'country']);
}
function locSeries(s: any, lang: Lang) {
  return localizeObj(s, lang, ['title', 'description', 'shortDesc', 'country']);
}

home.get('/', async (c) => {
  const db = getDb();
  const lang = getLang(c);

  // 1. Hero — featured movies/series (only published with backdrop + poster)
  const allFeaturedMovies = await db.select().from(movies)
    .where(and(eq(movies.isPublished, true), eq(movies.featured, true)))
    .limit(10);
  const featuredMovies = allFeaturedMovies.filter(m => m.backdropUrl && m.posterUrl).slice(0, 3);

  const allFeaturedSeries = await db.select().from(series)
    .where(and(eq(series.isPublished, true), eq(series.featured, true)))
    .limit(10);
  const featuredSeries = allFeaturedSeries.filter(s => s.backdropUrl && s.posterUrl).slice(0, 3);

  const hero = [
    ...featuredMovies.map(m => ({ type: 'movie' as const, ...locMovie(m, lang) })),
    ...featuredSeries.map(s => ({ type: 'series' as const, ...locSeries(s, lang) })),
  ];

  // 2. Collections with items
  const allCollections = await db.select().from(collections)
    .where(eq(collections.isActive, true))
    .orderBy(collections.sortOrder);

  const result = [];
  for (const coll of allCollections) {
    // Skip "continue-watching" — requires user context
    if (coll.slug === 'continue-watching') continue;

    const items = await db.select().from(collectionItems)
      .where(eq(collectionItems.collectionId, coll.id))
      .orderBy(collectionItems.sortOrder);

    const content = [];
    for (const item of items) {
      if (item.movieId) {
        const [m] = await db.select().from(movies).where(eq(movies.id, item.movieId));
        if (m && m.isPublished && m.posterUrl) content.push({ type: 'movie', ...locMovie(m, lang) });
      }
      if (item.seriesId) {
        const [s] = await db.select().from(series).where(eq(series.id, item.seriesId));
        if (s && s.isPublished && s.posterUrl) content.push({ type: 'series', ...locSeries(s, lang) });
      }
    }

    result.push({
      slug: coll.slug,
      title: localizeObj(coll, lang, ['title']).title,
      items: content,
    });
  }

  return c.json({ hero, collections: result });
});

export default home;
