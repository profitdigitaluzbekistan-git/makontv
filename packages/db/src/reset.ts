/**
 * Reset database: drops all tables and re-runs migrations + seed.
 * USE WITH CAUTION — destroys all data.
 */
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

async function reset() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');

  console.log('⚠️  Resetting database...');
  const sql = neon(url);

  // Drop all tables in correct order (respecting foreign keys)
  const tables = [
    'referral_rewards', 'downloads', 'collection_items', 'collections',
    'reviews', 'watch_history', 'favorites', 'notifications',
    'user_profiles', 'users', 'plans',
    'episodes', 'seasons',
    'series_cast', 'series_genres', 'movie_cast', 'movie_genres',
    'series', 'movies', 'persons', 'genres',
  ];

  for (const table of tables) {
    await sql(`DROP TABLE IF EXISTS "${table}" CASCADE`);
    console.log(`  ✓ Dropped ${table}`);
  }

  console.log('\n✅ All tables dropped. Run `npm run db:migrate && npm run db:seed` to recreate.\n');
}

reset().catch(console.error);
