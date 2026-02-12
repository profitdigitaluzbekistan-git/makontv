/**
 * Series API
 *
 * GET /api/series              — каталог сериалов (фильтры как у movies)
 * GET /api/series/:slug        — детали + сезоны + эпизоды + каст
 */
import { Hono } from 'hono';
import { eq, and, desc, inArray, ne } from 'drizzle-orm';
import {
  series, genres, seriesGenres, seriesCast, persons,
  seasons, episodes, reviews, users,
} from '@makontv/db';
import { getDb } from '../db';
import { getLang, localizeObj, getPagination, paginatedResponse, type Lang } from '../helpers';

const seriesRoute = new Hono();

function locSeries(s: any, lang: Lang) {
  return localizeObj(s, lang, ['title', 'description', 'shortDesc', 'country']);
}

// ═══ LIST ═══
seriesRoute.get('/', async (c) => {
  const db = getDb();
  const lang = getLang(c);
  const pagination = getPagination(c);

  const conditions = [eq(series.isPublished, true)];

  const genreSlug = c.req.query('genre');
  let genreSeriesIds: string[] | null = null;
  if (genreSlug) {
    const [genre] = await db.select().from(genres).where(eq(genres.slug, genreSlug));
    if (genre) {
      const links = await db.select().from(seriesGenres).where(eq(seriesGenres.genreId, genre.id));
      genreSeriesIds = links.map(l => l.seriesId);
      if (genreSeriesIds.length === 0) {
        return c.json(paginatedResponse([], 0, pagination));
      }
    }
  }

  const year = c.req.query('year');
  if (year) conditions.push(eq(series.year, parseInt(year)));

  const sort = c.req.query('sort') || 'new';
  let orderBy: any;
  switch (sort) {
    case 'rating': orderBy = desc(series.rating); break;
    case 'year': orderBy = desc(series.year); break;
    default: orderBy = desc(series.createdAt);
  }

  let allResults;
  if (genreSeriesIds) {
    allResults = await db.select().from(series)
      .where(and(...conditions, inArray(series.id, genreSeriesIds)))
      .orderBy(orderBy);
  } else {
    allResults = await db.select().from(series).where(and(...conditions)).orderBy(orderBy);
  }

  const total = allResults.length;
  const paged = allResults.slice(pagination.offset, pagination.offset + pagination.limit);

  const result = [];
  for (const s of paged) {
    const sGenres = await db.select({ slug: genres.slug, name: genres.name })
      .from(seriesGenres)
      .innerJoin(genres, eq(seriesGenres.genreId, genres.id))
      .where(eq(seriesGenres.seriesId, s.id));

    // Episode count
    const sSeasons = await db.select().from(seasons).where(eq(seasons.seriesId, s.id));
    let episodeCount = 0;
    for (const season of sSeasons) {
      const eps = await db.select().from(episodes).where(eq(episodes.seasonId, season.id));
      episodeCount += eps.length;
    }

    result.push({
      ...locSeries(s, lang),
      genres: sGenres.map(g => ({ slug: g.slug, name: localizeObj(g, lang, ['name']).name })),
      seasonCount: sSeasons.length,
      episodeCount,
    });
  }

  return c.json(paginatedResponse(result, total, pagination));
});

// ═══ DETAIL ═══
seriesRoute.get('/:slug', async (c) => {
  const db = getDb();
  const lang = getLang(c);
  const slug = c.req.param('slug');

  const [show] = await db.select().from(series).where(eq(series.slug, slug));
  if (!show) return c.json({ error: 'Series not found' }, 404);

  // Genres
  const sGenres = await db.select({ slug: genres.slug, name: genres.name })
    .from(seriesGenres)
    .innerJoin(genres, eq(seriesGenres.genreId, genres.id))
    .where(eq(seriesGenres.seriesId, show.id));

  // Cast
  const cast = await db.select({
    id: persons.id,
    name: persons.name,
    photoUrl: persons.photoUrl,
    role: seriesCast.role,
    characterName: seriesCast.characterName,
  })
    .from(seriesCast)
    .innerJoin(persons, eq(seriesCast.personId, persons.id))
    .where(eq(seriesCast.seriesId, show.id))
    .orderBy(seriesCast.sortOrder);

  // Seasons + Episodes
  const allSeasons = await db.select().from(seasons)
    .where(eq(seasons.seriesId, show.id))
    .orderBy(seasons.number);

  const seasonsWithEpisodes = [];
  for (const season of allSeasons) {
    const eps = await db.select().from(episodes)
      .where(eq(episodes.seasonId, season.id))
      .orderBy(episodes.number);

    seasonsWithEpisodes.push({
      ...localizeObj(season, lang, ['title', 'description']),
      episodes: eps.map(ep => localizeObj(ep, lang, ['title', 'description'])),
    });
  }

  // Reviews
  const seriesReviews = await db.select({
    id: reviews.id,
    rating: reviews.rating,
    text: reviews.text,
    createdAt: reviews.createdAt,
    userName: users.name,
    userAvatar: users.avatarLetter,
  })
    .from(reviews)
    .innerJoin(users, eq(reviews.userId, users.id))
    .where(eq(reviews.seriesId, show.id))
    .orderBy(desc(reviews.createdAt))
    .limit(20);

  // Similar
  const genreSlugs = sGenres.map(g => g.slug);
  const similarLinks = await db.select({ seriesId: seriesGenres.seriesId })
    .from(seriesGenres)
    .innerJoin(genres, eq(seriesGenres.genreId, genres.id))
    .where(and(
      inArray(genres.slug, genreSlugs),
      ne(seriesGenres.seriesId, show.id)
    ));
  const similarIds = [...new Set(similarLinks.map(l => l.seriesId))].slice(0, 6);
  const similar = similarIds.length > 0
    ? await db.select().from(series).where(and(inArray(series.id, similarIds), eq(series.isPublished, true)))
    : [];

  return c.json({
    ...locSeries(show, lang),
    genres: sGenres.map(g => ({ slug: g.slug, name: localizeObj(g, lang, ['name']).name })),
    cast: cast.map(p => localizeObj(p, lang, ['name', 'characterName'])),
    seasons: seasonsWithEpisodes,
    reviews: seriesReviews.map(r => ({
      ...r,
      userName: localizeObj({ userName: r.userName }, lang, ['userName']).userName,
    })),
    similar: similar.map(s => locSeries(s, lang)),
  });
});

export default seriesRoute;
