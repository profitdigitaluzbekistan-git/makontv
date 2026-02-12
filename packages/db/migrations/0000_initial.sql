-- MakonTV Initial Migration
-- Generated from Drizzle schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- GENRES
CREATE TABLE IF NOT EXISTS "genres" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug" varchar(50) NOT NULL UNIQUE,
  "name" jsonb NOT NULL DEFAULT '{}',
  "icon" varchar(100),
  "sort_order" integer DEFAULT 0,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

-- PERSONS
CREATE TABLE IF NOT EXISTS "persons" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" jsonb NOT NULL DEFAULT '{}',
  "photo_url" text,
  "bio" jsonb DEFAULT '{}',
  "birth_date" date,
  "birth_place" jsonb DEFAULT '{}',
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

-- MOVIES
CREATE TABLE IF NOT EXISTS "movies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug" varchar(200) NOT NULL UNIQUE,
  "title" jsonb NOT NULL DEFAULT '{}',
  "description" jsonb DEFAULT '{}',
  "short_desc" jsonb DEFAULT '{}',
  "year" integer,
  "duration_min" integer,
  "rating" decimal(3,1) DEFAULT 0,
  "rating_count" integer DEFAULT 0,
  "age_rating" varchar(10),
  "country" jsonb DEFAULT '{}',
  "quality" varchar(20) DEFAULT 'HD',
  "poster_url" text,
  "backdrop_url" text,
  "trailer_url" text,
  "video_url" text,
  "video_type" varchar(20) DEFAULT 'url',
  "subtitles" jsonb DEFAULT '[]',
  "audio_tracks" jsonb DEFAULT '[]',
  "is_premium" boolean DEFAULT false,
  "is_published" boolean DEFAULT false,
  "featured" boolean DEFAULT false,
  "sort_order" integer DEFAULT 0,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_movies_year" ON "movies" ("year");
CREATE INDEX IF NOT EXISTS "idx_movies_published" ON "movies" ("is_published");

-- MOVIE_GENRES
CREATE TABLE IF NOT EXISTS "movie_genres" (
  "movie_id" uuid NOT NULL REFERENCES "movies"("id") ON DELETE CASCADE,
  "genre_id" uuid NOT NULL REFERENCES "genres"("id") ON DELETE CASCADE,
  PRIMARY KEY ("movie_id", "genre_id")
);

-- MOVIE_CAST
CREATE TABLE IF NOT EXISTS "movie_cast" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "movie_id" uuid NOT NULL REFERENCES "movies"("id") ON DELETE CASCADE,
  "person_id" uuid NOT NULL REFERENCES "persons"("id") ON DELETE CASCADE,
  "role" varchar(50) DEFAULT 'actor',
  "character_name" jsonb DEFAULT '{}',
  "sort_order" integer DEFAULT 0
);

-- SERIES
CREATE TABLE IF NOT EXISTS "series" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug" varchar(200) NOT NULL UNIQUE,
  "title" jsonb NOT NULL DEFAULT '{}',
  "description" jsonb DEFAULT '{}',
  "short_desc" jsonb DEFAULT '{}',
  "year" integer,
  "rating" decimal(3,1) DEFAULT 0,
  "rating_count" integer DEFAULT 0,
  "age_rating" varchar(10),
  "country" jsonb DEFAULT '{}',
  "quality" varchar(20) DEFAULT 'HD',
  "poster_url" text,
  "backdrop_url" text,
  "trailer_url" text,
  "is_premium" boolean DEFAULT false,
  "is_published" boolean DEFAULT false,
  "featured" boolean DEFAULT false,
  "sort_order" integer DEFAULT 0,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

-- SERIES_GENRES
CREATE TABLE IF NOT EXISTS "series_genres" (
  "series_id" uuid NOT NULL REFERENCES "series"("id") ON DELETE CASCADE,
  "genre_id" uuid NOT NULL REFERENCES "genres"("id") ON DELETE CASCADE,
  PRIMARY KEY ("series_id", "genre_id")
);

-- SERIES_CAST
CREATE TABLE IF NOT EXISTS "series_cast" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "series_id" uuid NOT NULL REFERENCES "series"("id") ON DELETE CASCADE,
  "person_id" uuid NOT NULL REFERENCES "persons"("id") ON DELETE CASCADE,
  "role" varchar(50) DEFAULT 'actor',
  "character_name" jsonb DEFAULT '{}',
  "sort_order" integer DEFAULT 0
);

-- SEASONS
CREATE TABLE IF NOT EXISTS "seasons" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "series_id" uuid NOT NULL REFERENCES "series"("id") ON DELETE CASCADE,
  "number" integer NOT NULL,
  "title" jsonb DEFAULT '{}',
  "description" jsonb DEFAULT '{}',
  "poster_url" text,
  "created_at" timestamptz DEFAULT now(),
  UNIQUE("series_id", "number")
);

-- EPISODES
CREATE TABLE IF NOT EXISTS "episodes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "season_id" uuid NOT NULL REFERENCES "seasons"("id") ON DELETE CASCADE,
  "number" integer NOT NULL,
  "title" jsonb NOT NULL DEFAULT '{}',
  "description" jsonb DEFAULT '{}',
  "duration_min" integer,
  "thumbnail_url" text,
  "video_url" text,
  "video_type" varchar(20) DEFAULT 'url',
  "is_free" boolean DEFAULT false,
  "air_date" date,
  "created_at" timestamptz DEFAULT now(),
  UNIQUE("season_id", "number")
);

-- PLANS
CREATE TABLE IF NOT EXISTS "plans" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug" varchar(50) NOT NULL UNIQUE,
  "name" jsonb NOT NULL DEFAULT '{}',
  "price" integer DEFAULT 0,
  "price_label" jsonb DEFAULT '{}',
  "features" jsonb DEFAULT '[]',
  "max_devices" integer DEFAULT 1,
  "max_profiles" integer DEFAULT 1,
  "has_ads" boolean DEFAULT true,
  "quality" varchar(20) DEFAULT 'HD',
  "has_downloads" boolean DEFAULT false,
  "is_best" boolean DEFAULT false,
  "sort_order" integer DEFAULT 0,
  "created_at" timestamptz DEFAULT now()
);

-- USERS
CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" varchar(255) UNIQUE,
  "phone" varchar(20),
  "name" jsonb DEFAULT '{}',
  "avatar_url" text,
  "avatar_letter" varchar(1),
  "birth_date" date,
  "gender" varchar(10),
  "plan_id" uuid REFERENCES "plans"("id"),
  "subscription_status" varchar(20) DEFAULT 'guest',
  "subscription_expires_at" timestamptz,
  "referral_code" varchar(20) UNIQUE,
  "referred_by" uuid,
  "role" varchar(20) DEFAULT 'user',
  "is_blocked" boolean DEFAULT false,
  "language" varchar(5) DEFAULT 'ru',
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

-- USER_PROFILES
CREATE TABLE IF NOT EXISTS "user_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" varchar(50) NOT NULL,
  "avatar_url" text,
  "is_kids" boolean DEFAULT false,
  "is_default" boolean DEFAULT false,
  "created_at" timestamptz DEFAULT now()
);

-- FAVORITES
CREATE TABLE IF NOT EXISTS "favorites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "movie_id" uuid REFERENCES "movies"("id") ON DELETE CASCADE,
  "series_id" uuid REFERENCES "series"("id") ON DELETE CASCADE,
  "created_at" timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_favorites_user" ON "favorites" ("user_id");

-- WATCH_HISTORY
CREATE TABLE IF NOT EXISTS "watch_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "movie_id" uuid REFERENCES "movies"("id") ON DELETE SET NULL,
  "episode_id" uuid REFERENCES "episodes"("id") ON DELETE SET NULL,
  "progress_sec" integer DEFAULT 0,
  "duration_sec" integer DEFAULT 0,
  "progress_pct" decimal(5,2) DEFAULT 0,
  "watched_at" timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_watch_user" ON "watch_history" ("user_id");

-- REVIEWS
CREATE TABLE IF NOT EXISTS "reviews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "movie_id" uuid REFERENCES "movies"("id") ON DELETE CASCADE,
  "series_id" uuid REFERENCES "series"("id") ON DELETE CASCADE,
  "rating" integer,
  "text" text,
  "created_at" timestamptz DEFAULT now()
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid REFERENCES "users"("id") ON DELETE CASCADE,
  "type" varchar(50) NOT NULL,
  "title" jsonb NOT NULL DEFAULT '{}',
  "body" jsonb DEFAULT '{}',
  "icon_type" varchar(20),
  "action_url" varchar(200),
  "is_read" boolean DEFAULT false,
  "created_at" timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_notif_user" ON "notifications" ("user_id", "is_read");

-- COLLECTIONS
CREATE TABLE IF NOT EXISTS "collections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug" varchar(100) NOT NULL UNIQUE,
  "title" jsonb NOT NULL DEFAULT '{}',
  "type" varchar(20) DEFAULT 'manual',
  "auto_filter" jsonb DEFAULT '{}',
  "is_active" boolean DEFAULT true,
  "sort_order" integer DEFAULT 0,
  "page" varchar(20) DEFAULT 'home',
  "created_at" timestamptz DEFAULT now()
);

-- COLLECTION_ITEMS
CREATE TABLE IF NOT EXISTS "collection_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "collection_id" uuid NOT NULL REFERENCES "collections"("id") ON DELETE CASCADE,
  "movie_id" uuid REFERENCES "movies"("id") ON DELETE CASCADE,
  "series_id" uuid REFERENCES "series"("id") ON DELETE CASCADE,
  "sort_order" integer DEFAULT 0
);

-- DOWNLOADS
CREATE TABLE IF NOT EXISTS "downloads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "movie_id" uuid REFERENCES "movies"("id") ON DELETE SET NULL,
  "episode_id" uuid REFERENCES "episodes"("id") ON DELETE SET NULL,
  "file_size" integer,
  "downloaded_at" timestamptz DEFAULT now()
);

-- REFERRAL_REWARDS
CREATE TABLE IF NOT EXISTS "referral_rewards" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "referrer_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "referred_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "reward_days" integer DEFAULT 7,
  "status" varchar(20) DEFAULT 'pending',
  "created_at" timestamptz DEFAULT now()
);

-- UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_movies_upd BEFORE UPDATE ON movies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_series_upd BEFORE UPDATE ON series FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_users_upd BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_genres_upd BEFORE UPDATE ON genres FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_persons_upd BEFORE UPDATE ON persons FOR EACH ROW EXECUTE FUNCTION update_updated_at();
