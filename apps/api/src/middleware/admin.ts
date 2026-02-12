/**
 * Admin Middleware
 *
 * Временная защита через X-Admin-Secret header.
 * Будет заменена на JWT auth на Этапе 8.
 */
import type { MiddlewareHandler } from 'hono';

export const adminGuard: MiddlewareHandler = async (c, next) => {
  const secret = c.req.header('X-Admin-Secret');
  const expected = process.env.ADMIN_SECRET || 'changeme-makontv-admin-2025';

  if (!secret || secret !== expected) {
    return c.json({ error: 'Unauthorized. Provide X-Admin-Secret header.' }, 401);
  }

  await next();
};
