/**
 * Admin API — full CRUD for content management
 *
 * All routes protected by X-Admin-Secret header.
 * Refine data provider expects: { data: [...] } for list, { data: {...} } for single.
 *
 * Endpoints:
 *   /admin/movies       GET (list), POST (create)
 *   /admin/movies/:id   GET (one), PUT (update), DELETE
 *   /admin/series       GET, POST
 *   /admin/series/:id   GET, PUT, DELETE
 *   /admin/genres       GET, POST
 *   /admin/genres/:id   GET, PUT, DELETE
 *   /admin/persons      GET, POST
 *   /admin/persons/:id  GET, PUT, DELETE
 *   /admin/seasons      GET, POST
 *   /admin/seasons/:id  GET, PUT, DELETE
 *   /admin/episodes     GET, POST
 *   /admin/episodes/:id GET, PUT, DELETE
 *   /admin/collections  GET, POST
 *   /admin/collections/:id  GET, PUT, DELETE
 *   /admin/collection-items GET, POST, DELETE
 *   /admin/plans        GET, POST
 *   /admin/plans/:id    GET, PUT, DELETE
 *   /admin/users        GET
 *   /admin/users/:id    GET, PUT
 *   /admin/notifications GET, POST
 *   /admin/notifications/:id DELETE
 *   /admin/stats        GET (dashboard)
 */
import { Hono } from 'hono';
import { eq, desc, asc, sql, and, like, ilike } from 'drizzle-orm';
import {
  movies, series, genres, persons, seasons, episodes,
  movieGenres, seriesGenres, movieCast, seriesCast,
  collections, collectionItems, plans, users, notifications,
  favorites, watchHistory, reviews, userProfiles,
} from '@makontv/db';
import { getDb } from '../db';
import { adminGuard } from '../middleware/admin';

const admin = new Hono();
admin.use('/*', adminGuard);

// ════════════════════════════════════
// HELPER: Generic CRUD factory
// ════════════════════════════════════
function crudRoutes(
  path: string,
  table: any,
  options?: {
    orderBy?: any;
    searchField?: string;
    beforeCreate?: (data: any) => any;
    afterList?: (items: any[], db: any) => Promise<any[]>;
  }
) {
  const route = new Hono();

  // LIST
  route.get('/', async (c) => {
    const db = getDb();
    const page = parseInt(c.req.query('_page') || c.req.query('current') || '1');
    const limit = parseInt(c.req.query('_limit') || c.req.query('pageSize') || '25');
    const offset = (page - 1) * limit;
    const sortField = c.req.query('_sort') || c.req.query('sorter_field');
    const sortOrder = c.req.query('_order') || c.req.query('sorter_order') || 'asc';

    // Filters from Refine (field=value)
    const conditions: any[] = [];
    // Search
    const search = c.req.query('q') || c.req.query('_q');
    if (search && options?.searchField) {
      conditions.push(
        sql`${table[options.searchField]}->>'ru' ILIKE ${'%' + search + '%'}`
      );
    }

    let query;
    if (conditions.length > 0) {
      query = db.select().from(table).where(and(...conditions));
    } else {
      query = db.select().from(table);
    }

    // Get total
    const allItems = await query;
    const total = allItems.length;

    // Sort + paginate
    let orderByClause = options?.orderBy || desc(table.createdAt);
    if (sortField && table[sortField]) {
      orderByClause = sortOrder === 'desc' ? desc(table[sortField]) : asc(table[sortField]);
    }

    let results;
    if (conditions.length > 0) {
      results = await db.select().from(table).where(and(...conditions))
        .orderBy(orderByClause).limit(limit).offset(offset);
    } else {
      results = await db.select().from(table)
        .orderBy(orderByClause).limit(limit).offset(offset);
    }

    if (options?.afterList) {
      results = await options.afterList(results, db);
    }

    // Refine expects x-total-count header for pagination
    c.header('x-total-count', String(total));
    c.header('Access-Control-Expose-Headers', 'x-total-count');
    return c.json(results);
  });

  // GET ONE
  route.get('/:id', async (c) => {
    const db = getDb();
    const id = c.req.param('id');
    const [item] = await db.select().from(table).where(eq(table.id, id));
    if (!item) return c.json({ error: 'Not found' }, 404);
    return c.json(item);
  });

  // CREATE
  route.post('/', async (c) => {
    const db = getDb();
    let body = await c.req.json();
    if (options?.beforeCreate) body = options.beforeCreate(body);
    // Remove id if it's empty string
    if (body.id === '' || body.id === undefined) delete body.id;
    const [created] = await db.insert(table).values(body).returning();
    return c.json(created, 201);
  });

  // UPDATE
  route.put('/:id', async (c) => {
    const db = getDb();
    const id = c.req.param('id');
    const body = await c.req.json();
    delete body.id; // don't update PK
    delete body.createdAt;
    const [updated] = await db.update(table).set(body).where(eq(table.id, id)).returning();
    if (!updated) return c.json({ error: 'Not found' }, 404);
    return c.json(updated);
  });

  // PATCH (same as PUT for Refine compatibility)
  route.patch('/:id', async (c) => {
    const db = getDb();
    const id = c.req.param('id');
    const body = await c.req.json();
    delete body.id;
    delete body.createdAt;
    const [updated] = await db.update(table).set(body).where(eq(table.id, id)).returning();
    if (!updated) return c.json({ error: 'Not found' }, 404);
    return c.json(updated);
  });

  // DELETE
  route.delete('/:id', async (c) => {
    const db = getDb();
    const id = c.req.param('id');
    await db.delete(table).where(eq(table.id, id));
    return c.json({ ok: true });
  });

  return route;
}

// ════════════════════════════════════
// MOUNT CRUD ROUTES
// ════════════════════════════════════

admin.route('/genres', crudRoutes('genres', genres, {
  orderBy: asc(genres.sortOrder),
  searchField: 'name',
}));

admin.route('/movies', crudRoutes('movies', movies, {
  orderBy: desc(movies.createdAt),
  searchField: 'title',
}));

admin.route('/series', crudRoutes('series', series, {
  orderBy: desc(series.createdAt),
  searchField: 'title',
}));

admin.route('/persons', crudRoutes('persons', persons, {
  orderBy: desc(persons.createdAt),
  searchField: 'name',
}));

admin.route('/seasons', crudRoutes('seasons', seasons, {
  orderBy: asc(seasons.number),
}));

admin.route('/episodes', crudRoutes('episodes', episodes, {
  orderBy: asc(episodes.number),
  searchField: 'title',
}));

admin.route('/collections', crudRoutes('collections', collections, {
  orderBy: asc(collections.sortOrder),
  searchField: 'title',
}));

admin.route('/plans', crudRoutes('plans', plans, {
  orderBy: asc(plans.sortOrder),
  searchField: 'name',
}));

admin.route('/users', crudRoutes('users', users, {
  orderBy: desc(users.createdAt),
}));

admin.route('/notifications', crudRoutes('notifications', notifications, {
  orderBy: desc(notifications.createdAt),
}));

// ════════════════════════════════════
// SPECIAL: Movie-Genre links
// ════════════════════════════════════
admin.get('/movie-genres/:movieId', async (c) => {
  const db = getDb();
  const movieId = c.req.param('movieId');
  const links = await db.select().from(movieGenres).where(eq(movieGenres.movieId, movieId));
  return c.json(links);
});

admin.post('/movie-genres', async (c) => {
  const db = getDb();
  const body = await c.req.json<{ movieId: string; genreId: string }>();
  await db.insert(movieGenres).values(body);
  return c.json({ ok: true }, 201);
});

admin.delete('/movie-genres/:movieId/:genreId', async (c) => {
  const db = getDb();
  const { movieId, genreId } = c.req.param();
  await db.delete(movieGenres).where(
    and(eq(movieGenres.movieId, movieId), eq(movieGenres.genreId, genreId))
  );
  return c.json({ ok: true });
});

// Series-Genre links
admin.get('/series-genres/:seriesId', async (c) => {
  const db = getDb();
  const seriesId = c.req.param('seriesId');
  const links = await db.select().from(seriesGenres).where(eq(seriesGenres.seriesId, seriesId));
  return c.json(links);
});

admin.post('/series-genres', async (c) => {
  const db = getDb();
  const body = await c.req.json<{ seriesId: string; genreId: string }>();
  await db.insert(seriesGenres).values(body);
  return c.json({ ok: true }, 201);
});

// ════════════════════════════════════
// SPECIAL: Movie-Cast links
// ════════════════════════════════════
admin.route('/movie-cast', crudRoutes('movie-cast', movieCast));
admin.route('/series-cast', crudRoutes('series-cast', seriesCast));

// ════════════════════════════════════
// SPECIAL: Collection Items
// ════════════════════════════════════
admin.get('/collection-items/:collectionId', async (c) => {
  const db = getDb();
  const collectionId = c.req.param('collectionId');
  const items = await db.select().from(collectionItems)
    .where(eq(collectionItems.collectionId, collectionId))
    .orderBy(asc(collectionItems.sortOrder));
  return c.json(items);
});

admin.post('/collection-items', async (c) => {
  const db = getDb();
  const body = await c.req.json();
  const [created] = await db.insert(collectionItems).values(body).returning();
  return c.json(created, 201);
});

admin.delete('/collection-items/:id', async (c) => {
  const db = getDb();
  const id = c.req.param('id');
  await db.delete(collectionItems).where(eq(collectionItems.id, id));
  return c.json({ ok: true });
});

// ════════════════════════════════════
// DASHBOARD STATS
// ════════════════════════════════════
admin.get('/stats', async (c) => {
  const db = getDb();

  const [moviesCount] = await db.select({ count: sql<number>`count(*)` }).from(movies);
  const [seriesCount] = await db.select({ count: sql<number>`count(*)` }).from(series);
  const [usersCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
  const [genresCount] = await db.select({ count: sql<number>`count(*)` }).from(genres);
  const [personsCount] = await db.select({ count: sql<number>`count(*)` }).from(persons);
  const [episodesCount] = await db.select({ count: sql<number>`count(*)` }).from(episodes);
  const [reviewsCount] = await db.select({ count: sql<number>`count(*)` }).from(reviews);
  const [collectionsCount] = await db.select({ count: sql<number>`count(*)` }).from(collections);

  const recentMovies = await db.select().from(movies).orderBy(desc(movies.createdAt)).limit(5);
  const recentUsers = await db.select().from(users).orderBy(desc(users.createdAt)).limit(5);

  return c.json({
    counts: {
      movies: moviesCount.count,
      series: seriesCount.count,
      users: usersCount.count,
      genres: genresCount.count,
      persons: personsCount.count,
      episodes: episodesCount.count,
      reviews: reviewsCount.count,
      collections: collectionsCount.count,
    },
    recentMovies,
    recentUsers,
  });
});

export default admin;
