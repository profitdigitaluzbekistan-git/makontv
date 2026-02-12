/**
 * MakonTV Database Schema (Drizzle ORM)
 * All tables from Этап 1 data model
 */
import {
  pgTable, uuid, varchar, text, integer, decimal, boolean,
  timestamp, date, jsonb, uniqueIndex, index, check, primaryKey,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ════════════════════════════════
// GENRES
// ════════════════════════════════
export const genres = pgTable('genres', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 50 }).notNull().unique(),
  name: jsonb('name').notNull().default({}),            // {"ru":"Триллер","uz":"Triller"}
  icon: varchar('icon', { length: 100 }),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ════════════════════════════════
// PERSONS (actors, directors)
// ════════════════════════════════
export const persons = pgTable('persons', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: jsonb('name').notNull().default({}),
  photoUrl: text('photo_url'),
  bio: jsonb('bio').default({}),
  birthDate: date('birth_date'),
  birthPlace: jsonb('birth_place').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ════════════════════════════════
// MOVIES
// ════════════════════════════════
export const movies = pgTable('movies', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 200 }).notNull().unique(),
  title: jsonb('title').notNull().default({}),
  description: jsonb('description').default({}),
  shortDesc: jsonb('short_desc').default({}),
  year: integer('year'),
  durationMin: integer('duration_min'),
  rating: decimal('rating', { precision: 3, scale: 1 }).default('0'),
  ratingCount: integer('rating_count').default(0),
  ageRating: varchar('age_rating', { length: 10 }),
  country: jsonb('country').default({}),
  quality: varchar('quality', { length: 20 }).default('HD'),
  posterUrl: text('poster_url'),
  backdropUrl: text('backdrop_url'),
  trailerUrl: text('trailer_url'),
  videoUrl: text('video_url'),
  videoType: varchar('video_type', { length: 20 }).default('url'),
  subtitles: jsonb('subtitles').default([]),
  audioTracks: jsonb('audio_tracks').default([]),
  isPremium: boolean('is_premium').default(false),
  isPublished: boolean('is_published').default(false),
  featured: boolean('featured').default(false),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_movies_year').on(table.year),
  index('idx_movies_published').on(table.isPublished),
]);

// ════════════════════════════════
// MOVIE <-> GENRE (M2M)
// ════════════════════════════════
export const movieGenres = pgTable('movie_genres', {
  movieId: uuid('movie_id').notNull().references(() => movies.id, { onDelete: 'cascade' }),
  genreId: uuid('genre_id').notNull().references(() => genres.id, { onDelete: 'cascade' }),
}, (table) => [
  primaryKey({ columns: [table.movieId, table.genreId] }),
]);

// ════════════════════════════════
// MOVIE <-> PERSON (cast/crew)
// ════════════════════════════════
export const movieCast = pgTable('movie_cast', {
  id: uuid('id').primaryKey().defaultRandom(),
  movieId: uuid('movie_id').notNull().references(() => movies.id, { onDelete: 'cascade' }),
  personId: uuid('person_id').notNull().references(() => persons.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 50 }).default('actor'),
  characterName: jsonb('character_name').default({}),
  sortOrder: integer('sort_order').default(0),
});

// ════════════════════════════════
// SERIES
// ════════════════════════════════
export const series = pgTable('series', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 200 }).notNull().unique(),
  title: jsonb('title').notNull().default({}),
  description: jsonb('description').default({}),
  shortDesc: jsonb('short_desc').default({}),
  year: integer('year'),
  rating: decimal('rating', { precision: 3, scale: 1 }).default('0'),
  ratingCount: integer('rating_count').default(0),
  ageRating: varchar('age_rating', { length: 10 }),
  country: jsonb('country').default({}),
  quality: varchar('quality', { length: 20 }).default('HD'),
  posterUrl: text('poster_url'),
  backdropUrl: text('backdrop_url'),
  trailerUrl: text('trailer_url'),
  isPremium: boolean('is_premium').default(false),
  isPublished: boolean('is_published').default(false),
  featured: boolean('featured').default(false),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ════════════════════════════════
// SERIES <-> GENRE
// ════════════════════════════════
export const seriesGenres = pgTable('series_genres', {
  seriesId: uuid('series_id').notNull().references(() => series.id, { onDelete: 'cascade' }),
  genreId: uuid('genre_id').notNull().references(() => genres.id, { onDelete: 'cascade' }),
}, (table) => [
  primaryKey({ columns: [table.seriesId, table.genreId] }),
]);

// ════════════════════════════════
// SERIES <-> PERSON
// ════════════════════════════════
export const seriesCast = pgTable('series_cast', {
  id: uuid('id').primaryKey().defaultRandom(),
  seriesId: uuid('series_id').notNull().references(() => series.id, { onDelete: 'cascade' }),
  personId: uuid('person_id').notNull().references(() => persons.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 50 }).default('actor'),
  characterName: jsonb('character_name').default({}),
  sortOrder: integer('sort_order').default(0),
});

// ════════════════════════════════
// SEASONS
// ════════════════════════════════
export const seasons = pgTable('seasons', {
  id: uuid('id').primaryKey().defaultRandom(),
  seriesId: uuid('series_id').notNull().references(() => series.id, { onDelete: 'cascade' }),
  number: integer('number').notNull(),
  title: jsonb('title').default({}),
  description: jsonb('description').default({}),
  posterUrl: text('poster_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  uniqueIndex('uq_season_series_number').on(table.seriesId, table.number),
]);

// ════════════════════════════════
// EPISODES
// ════════════════════════════════
export const episodes = pgTable('episodes', {
  id: uuid('id').primaryKey().defaultRandom(),
  seasonId: uuid('season_id').notNull().references(() => seasons.id, { onDelete: 'cascade' }),
  number: integer('number').notNull(),
  title: jsonb('title').notNull().default({}),
  description: jsonb('description').default({}),
  durationMin: integer('duration_min'),
  thumbnailUrl: text('thumbnail_url'),
  videoUrl: text('video_url'),
  videoType: varchar('video_type', { length: 20 }).default('url'),
  isFree: boolean('is_free').default(false),
  airDate: date('air_date'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  uniqueIndex('uq_episode_season_number').on(table.seasonId, table.number),
]);

// ════════════════════════════════
// PLANS (subscription tiers)
// ════════════════════════════════
export const plans = pgTable('plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 50 }).notNull().unique(),
  name: jsonb('name').notNull().default({}),
  price: integer('price').default(0),
  priceLabel: jsonb('price_label').default({}),
  features: jsonb('features').default([]),
  maxDevices: integer('max_devices').default(1),
  maxProfiles: integer('max_profiles').default(1),
  hasAds: boolean('has_ads').default(true),
  quality: varchar('quality', { length: 20 }).default('HD'),
  hasDownloads: boolean('has_downloads').default(false),
  isBest: boolean('is_best').default(false),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ════════════════════════════════
// USERS
// ════════════════════════════════
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique(),
  phone: varchar('phone', { length: 20 }),
  name: jsonb('name').default({}),
  avatarUrl: text('avatar_url'),
  avatarLetter: varchar('avatar_letter', { length: 1 }),
  birthDate: date('birth_date'),
  gender: varchar('gender', { length: 10 }),
  planId: uuid('plan_id').references(() => plans.id),
  subscriptionStatus: varchar('subscription_status', { length: 20 }).default('guest'),
  subscriptionExpiresAt: timestamp('subscription_expires_at', { withTimezone: true }),
  referralCode: varchar('referral_code', { length: 20 }).unique(),
  referredBy: uuid('referred_by'),
  role: varchar('role', { length: 20 }).default('user'),
  isBlocked: boolean('is_blocked').default(false),
  language: varchar('language', { length: 5 }).default('ru'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ════════════════════════════════
// USER PROFILES (multi-profile)
// ════════════════════════════════
export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 50 }).notNull(),
  avatarUrl: text('avatar_url'),
  isKids: boolean('is_kids').default(false),
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ════════════════════════════════
// FAVORITES
// ════════════════════════════════
export const favorites = pgTable('favorites', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  movieId: uuid('movie_id').references(() => movies.id, { onDelete: 'cascade' }),
  seriesId: uuid('series_id').references(() => series.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_favorites_user').on(table.userId),
]);

// ════════════════════════════════
// WATCH HISTORY / CONTINUE WATCHING
// ════════════════════════════════
export const watchHistory = pgTable('watch_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  movieId: uuid('movie_id').references(() => movies.id, { onDelete: 'set null' }),
  episodeId: uuid('episode_id').references(() => episodes.id, { onDelete: 'set null' }),
  progressSec: integer('progress_sec').default(0),
  durationSec: integer('duration_sec').default(0),
  progressPct: decimal('progress_pct', { precision: 5, scale: 2 }).default('0'),
  watchedAt: timestamp('watched_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_watch_user').on(table.userId),
]);

// ════════════════════════════════
// REVIEWS
// ════════════════════════════════
export const reviews = pgTable('reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  movieId: uuid('movie_id').references(() => movies.id, { onDelete: 'cascade' }),
  seriesId: uuid('series_id').references(() => series.id, { onDelete: 'cascade' }),
  rating: integer('rating'),
  text: text('text'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ════════════════════════════════
// NOTIFICATIONS
// ════════════════════════════════
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(),
  title: jsonb('title').notNull().default({}),
  body: jsonb('body').default({}),
  iconType: varchar('icon_type', { length: 20 }),
  actionUrl: varchar('action_url', { length: 200 }),
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_notif_user').on(table.userId, table.isRead),
]);

// ════════════════════════════════
// COLLECTIONS (home page carousels)
// ════════════════════════════════
export const collections = pgTable('collections', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  title: jsonb('title').notNull().default({}),
  type: varchar('type', { length: 20 }).default('manual'),
  autoFilter: jsonb('auto_filter').default({}),
  isActive: boolean('is_active').default(true),
  sortOrder: integer('sort_order').default(0),
  page: varchar('page', { length: 20 }).default('home'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ════════════════════════════════
// COLLECTION ITEMS
// ════════════════════════════════
export const collectionItems = pgTable('collection_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  collectionId: uuid('collection_id').notNull().references(() => collections.id, { onDelete: 'cascade' }),
  movieId: uuid('movie_id').references(() => movies.id, { onDelete: 'cascade' }),
  seriesId: uuid('series_id').references(() => series.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').default(0),
});

// ════════════════════════════════
// DOWNLOADS (metadata)
// ════════════════════════════════
export const downloads = pgTable('downloads', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  movieId: uuid('movie_id').references(() => movies.id, { onDelete: 'set null' }),
  episodeId: uuid('episode_id').references(() => episodes.id, { onDelete: 'set null' }),
  fileSize: integer('file_size'),
  downloadedAt: timestamp('downloaded_at', { withTimezone: true }).defaultNow(),
});

// ════════════════════════════════
// REFERRAL REWARDS
// ════════════════════════════════
export const referralRewards = pgTable('referral_rewards', {
  id: uuid('id').primaryKey().defaultRandom(),
  referrerId: uuid('referrer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  referredId: uuid('referred_id').references(() => users.id, { onDelete: 'set null' }),
  rewardDays: integer('reward_days').default(7),
  status: varchar('status', { length: 20 }).default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
