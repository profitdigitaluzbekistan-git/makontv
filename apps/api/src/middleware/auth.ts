/**
 * Auth Middleware
 *
 * Usage:
 *   app.use('/api/protected/*', authRequired);          // any authenticated user
 *   app.use('/admin/*', authRequired, roleRequired('admin')); // admin only
 *
 * Sets c.set('userId', ...) and c.set('userRole', ...) on context.
 */
import type { MiddlewareHandler } from 'hono';
import { verifyAccessToken } from '@makontv/shared';

// ═══ AUTH REQUIRED ═══
export const authRequired: MiddlewareHandler = async (c, next) => {
  const header = c.req.header('Authorization');

  if (!header || !header.startsWith('Bearer ')) {
    return c.json({ error: 'Требуется авторизация', code: 'AUTH_REQUIRED' }, 401);
  }

  const token = header.slice(7);
  const payload = await verifyAccessToken(token);

  if (!payload) {
    return c.json({ error: 'Недействительный или истёкший токен', code: 'TOKEN_INVALID' }, 401);
  }

  // Set user context
  c.set('userId', payload.sub);
  c.set('userEmail', payload.email);
  c.set('userRole', payload.role);

  await next();
};

// ═══ OPTIONAL AUTH (doesn't fail, just sets user if token present) ═══
export const authOptional: MiddlewareHandler = async (c, next) => {
  const header = c.req.header('Authorization');

  if (header && header.startsWith('Bearer ')) {
    const token = header.slice(7);
    const payload = await verifyAccessToken(token);
    if (payload) {
      c.set('userId', payload.sub);
      c.set('userEmail', payload.email);
      c.set('userRole', payload.role);
    }
  }

  await next();
};

// ═══ ROLE REQUIRED ═══
export function roleRequired(...roles: string[]): MiddlewareHandler {
  return async (c, next) => {
    const userRole = c.get('userRole');
    if (!userRole || !roles.includes(userRole)) {
      return c.json({ error: 'Недостаточно прав', code: 'FORBIDDEN' }, 403);
    }
    await next();
  };
}

// ═══ COMBINED: Admin guard (replaces X-Admin-Secret) ═══
export const adminAuth: MiddlewareHandler = async (c, next) => {
  // Support both: JWT token OR X-Admin-Secret (for backward compat)
  const adminSecret = c.req.header('X-Admin-Secret');
  const expected = process.env.ADMIN_SECRET || 'changeme-makontv-admin-2025';

  if (adminSecret === expected) {
    c.set('userRole', 'admin');
    await next();
    return;
  }

  // Try JWT
  const header = c.req.header('Authorization');
  if (!header || !header.startsWith('Bearer ')) {
    return c.json({ error: 'Требуется авторизация (JWT или X-Admin-Secret)', code: 'AUTH_REQUIRED' }, 401);
  }

  const token = header.slice(7);
  const payload = await verifyAccessToken(token);

  if (!payload) {
    return c.json({ error: 'Недействительный токен', code: 'TOKEN_INVALID' }, 401);
  }

  if (!['admin', 'editor'].includes(payload.role)) {
    return c.json({ error: 'Нужна роль admin или editor', code: 'FORBIDDEN' }, 403);
  }

  c.set('userId', payload.sub);
  c.set('userRole', payload.role);
  await next();
};
