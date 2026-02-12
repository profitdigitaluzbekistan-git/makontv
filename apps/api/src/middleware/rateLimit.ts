/**
 * Rate Limiting Middleware
 *
 * In-memory rate limiter. For production with multiple instances,
 * replace with Redis-based limiter.
 *
 * Usage:
 *   app.use('/api/auth/*', rateLimit({ max: 10, window: 60 })); // 10 req/min
 */
import type { MiddlewareHandler } from 'hono';

interface RateLimitConfig {
  max: number;       // max requests
  window: number;    // time window in seconds
  message?: string;
}

const stores = new Map<string, Map<string, { count: number; resetAt: number }>>();

export function rateLimit(config: RateLimitConfig): MiddlewareHandler {
  const { max, window: windowSec, message } = config;
  const storeKey = `${max}-${windowSec}`;
  
  if (!stores.has(storeKey)) {
    stores.set(storeKey, new Map());
    // Cleanup every minute
    setInterval(() => {
      const store = stores.get(storeKey)!;
      const now = Date.now();
      for (const [key, val] of store) {
        if (val.resetAt < now) store.delete(key);
      }
    }, 60000);
  }

  return async (c, next) => {
    const store = stores.get(storeKey)!;
    const key = c.req.header('x-forwarded-for') || c.req.header('cf-connecting-ip') || 'unknown';
    const now = Date.now();

    let entry = store.get(key);
    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + windowSec * 1000 };
      store.set(key, entry);
    }

    entry.count++;

    // Set headers
    c.header('X-RateLimit-Limit', String(max));
    c.header('X-RateLimit-Remaining', String(Math.max(0, max - entry.count)));
    c.header('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > max) {
      return c.json({
        error: message || 'Слишком много запросов. Попробуйте позже.',
        code: 'RATE_LIMITED',
        retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      }, 429);
    }

    await next();
  };
}

// Presets
export const authRateLimit = rateLimit({ max: 10, window: 60, message: 'Слишком много попыток входа' });
export const apiRateLimit = rateLimit({ max: 100, window: 60 });
export const uploadRateLimit = rateLimit({ max: 20, window: 60, message: 'Слишком много загрузок' });
export const searchRateLimit = rateLimit({ max: 30, window: 60 });
