/**
 * Movies API
 *
 * GET /api/movies              — каталог с фильтрами
 *   ?lang=ru|uz
 *   ?genre=thriller            — фильтр по жанру (slug)
 *   ?year=2024                 — фильтр по году
 *   ?quality=4K                — фильтр по качеству
 *   ?sort=rating|year|new      — сортировка
 *   ?page=1&limit=20           — пагинация
 *
 * GET /api/movies/:slug        — детали фильма (cast, genres, similar, reviews)
 */
import { Hono } from 'hono';
import { eq, and, desc, asc, sql, inArray, ne } from 'drizzle-orm';
import {
  movies, genres, movieGenres, movieCast, persons, reviews, users,
} from '@makontv/db';
import { getDb } from '../db';
import { getLang, localizeObj, localizeArray, getPagination, paginatedResponse, type Lang } from '../helpers';

const moviesRoute = new Hono();

function locMovie(m: any, lang: Lang) {
  return localizeObj(m, lang, ['title', 'description', 'shortDesc', 'country']);
}

// ═══ LIST ═══
moviesRoute.get('/', async (c) => {
  const db = getDb();
  const lang = getLang(c);
  const pagination = getPagination(c);

  // Build conditions
  const conditions = [eq(movies.isPublished, true)];

  // Genre filter
  const genreSlug = c.req.query('genre');
  let genreMovieIds: string[] | null = null;
  if (genreSlug) {
    const [genre] = await db.select().from(genres).where(eq(genres.slug, genreSlug));
    if (genre) {
      const links = await db.select().from(movieGenres).where(eq(movieGenres.genreId, genre.id));
      genreMovieIds = links.map(l => l.movieId);
      if (genreMovieIds.length === 0) {
        return c.json(paginatedResponse([], 0, pagination));
      }
    }
  }

  // Year filter
  const year = c.req.query('year');
  if (year) conditions.push(eq(movies.year, parseInt(year)));

  // Quality filter
  const quality = c.req.query('quality');
  if (quality) conditions.push(eq(movies.quality, quality));

  // Sort
  const sort = c.req.query('sort') || 'new';
  let orderBy: any;
  switch (sort) {
    case 'rating': orderBy = desc(movies.rating); break;
    case 'year': orderBy = desc(movies.year); break;
    default: orderBy = desc(movies.createdAt);
  }

  // Query
  let query = db.select().from(movies).where(and(...conditions)).orderBy(orderBy);

  // Apply genre filter via IDs
  if (genreMovieIds) {
    query = db.select().from(movies)
      .where(and(...conditions, inArray(movies.id, genreMovieIds)))
      .orderBy(orderBy);
  }

  // Count total
  const allResults = await query;
  const total = allResults.length;
  const paged = allResults.slice(pagination.offset, pagination.offset + pagination.limit);

  // Attach genres to each movie
  const result = [];
  for (const m of paged) {
    const mGenres = await db.select({ slug: genres.slug, name: genres.name })
      .from(movieGenres)
      .innerJoin(genres, eq(movieGenres.genreId, genres.id))
      .where(eq(movieGenres.movieId, m.id));

    result.push({
      ...locMovie(m, lang),
      genres: mGenres.map(g => ({ slug: g.slug, name: localizeObj(g, lang, ['name']).name })),
    });
  }

  return c.json(paginatedResponse(result, total, pagination));
});

// ═══ DETAIL ═══
moviesRoute.get('/:slug', async (c) => {
  const db = getDb();
  const lang = getLang(c);
  const slug = c.req.param('slug');

  const [movie] = await db.select().from(movies).where(eq(movies.slug, slug));
  if (!movie) return c.json({ error: 'Movie not found' }, 404);

  // Genres
  const mGenres = await db.select({ slug: genres.slug, name: genres.name })
    .from(movieGenres)
    .innerJoin(genres, eq(movieGenres.genreId, genres.id))
    .where(eq(movieGenres.movieId, movie.id));

  // Cast
  const cast = await db.select({
    id: persons.id,
    name: persons.name,
    photoUrl: persons.photoUrl,
    role: movieCast.role,
    characterName: movieCast.characterName,
  })
    .from(movieCast)
    .innerJoin(persons, eq(movieCast.personId, persons.id))
    .where(eq(movieCast.movieId, movie.id))
    .orderBy(movieCast.sortOrder);

  // Reviews
  const movieReviews = await db.select({
    id: reviews.id,
    rating: reviews.rating,
    text: reviews.text,
    createdAt: reviews.createdAt,
    userName: users.name,
    userAvatar: users.avatarLetter,
  })
    .from(reviews)
    .innerJoin(users, eq(reviews.userId, users.id))
    .where(eq(reviews.movieId, movie.id))
    .orderBy(desc(reviews.createdAt))
    .limit(20);

  // Similar movies (same genres, different movie)
  const genreIds = mGenres.map(g => g.slug);
  const similarLinks = await db.select({ movieId: movieGenres.movieId })
    .from(movieGenres)
    .innerJoin(genres, eq(movieGenres.genreId, genres.id))
    .where(and(
      inArray(genres.slug, genreIds),
      ne(movieGenres.movieId, movie.id)
    ));
  const similarIds = [...new Set(similarLinks.map(l => l.movieId))].slice(0, 6);
  const similar = similarIds.length > 0
    ? await db.select().from(movies).where(and(inArray(movies.id, similarIds), eq(movies.isPublished, true)))
    : [];

  return c.json({
    ...locMovie(movie, lang),
    genres: mGenres.map(g => ({ slug: g.slug, name: localizeObj(g, lang, ['name']).name })),
    cast: cast.map(p => ({
      ...localizeObj(p, lang, ['name', 'characterName']),
    })),
    reviews: movieReviews.map(r => ({
      ...r,
      userName: localizeObj({ userName: r.userName }, lang, ['userName']).userName,
    })),
    similar: similar.map(m => locMovie(m, lang)),
  });
});

export default moviesRoute;
