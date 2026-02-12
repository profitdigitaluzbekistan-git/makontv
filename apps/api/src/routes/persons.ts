/**
 * GET /api/persons/:id — страница актёра (био + фильмография)
 */
import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import {
  persons, movieCast, movies, seriesCast, series,
} from '@makontv/db';
import { getDb } from '../db';
import { getLang, localizeObj, type Lang } from '../helpers';

const personsRoute = new Hono();

personsRoute.get('/:id', async (c) => {
  const db = getDb();
  const lang = getLang(c);
  const id = c.req.param('id');

  const [person] = await db.select().from(persons).where(eq(persons.id, id));
  if (!person) return c.json({ error: 'Person not found' }, 404);

  // Movie filmography
  const movieRoles = await db.select({
    movieId: movies.id,
    slug: movies.slug,
    title: movies.title,
    year: movies.year,
    posterUrl: movies.posterUrl,
    rating: movies.rating,
    role: movieCast.role,
    characterName: movieCast.characterName,
  })
    .from(movieCast)
    .innerJoin(movies, eq(movieCast.movieId, movies.id))
    .where(eq(movieCast.personId, id));

  // Series filmography
  const seriesRoles = await db.select({
    seriesId: series.id,
    slug: series.slug,
    title: series.title,
    year: series.year,
    posterUrl: series.posterUrl,
    rating: series.rating,
    role: seriesCast.role,
    characterName: seriesCast.characterName,
  })
    .from(seriesCast)
    .innerJoin(series, eq(seriesCast.seriesId, series.id))
    .where(eq(seriesCast.personId, id));

  return c.json({
    ...localizeObj(person, lang, ['name', 'bio', 'birthPlace']),
    filmography: [
      ...movieRoles.map(r => ({
        type: 'movie',
        ...localizeObj(r, lang, ['title', 'characterName']),
      })),
      ...seriesRoles.map(r => ({
        type: 'series',
        ...localizeObj(r, lang, ['title', 'characterName']),
      })),
    ],
  });
});

export default personsRoute;
