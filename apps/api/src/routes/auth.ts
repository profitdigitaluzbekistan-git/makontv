/**
 * Auth API
 *
 * POST /api/auth/register    — регистрация
 * POST /api/auth/login       — вход
 * POST /api/auth/refresh     — обновить access token
 * GET  /api/auth/me          — текущий пользователь
 * POST /api/auth/password    — сменить пароль
 * POST /api/auth/logout      — выход (клиентский)
 */
import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { users, userProfiles, plans } from '@makontv/db';
import {
  hashPassword, verifyPassword,
  generateTokenPair, verifyRefreshToken,
  generateReferralCode,
} from '@makontv/shared';
import { getDb } from '../db';
import { authRequired } from '../middleware/auth';

const auth = new Hono();

// ═══ REGISTER ═══
auth.post('/register', async (c) => {
  const db = getDb();
  const body = await c.req.json<{
    email: string;
    password: string;
    name?: string;
    language?: string;
    referralCode?: string;
  }>();

  // Validate
  if (!body.email || !body.password) {
    return c.json({ error: 'Email и пароль обязательны' }, 400);
  }
  if (body.password.length < 6) {
    return c.json({ error: 'Пароль минимум 6 символов' }, 400);
  }
  if (!body.email.includes('@')) {
    return c.json({ error: 'Неверный формат email' }, 400);
  }

  // Check if email exists
  const existing = await db.select().from(users).where(eq(users.email, body.email.toLowerCase()));
  if (existing.length > 0) {
    return c.json({ error: 'Этот email уже зарегистрирован' }, 409);
  }

  // Hash password
  const passwordHash = await hashPassword(body.password);

  // Find referrer
  let referredBy: string | null = null;
  if (body.referralCode) {
    const [referrer] = await db.select().from(users)
      .where(eq(users.referralCode, body.referralCode));
    if (referrer) referredBy = referrer.id;
  }

  // Find free plan
  const [freePlan] = await db.select().from(plans).where(eq(plans.slug, 'basic'));

  // Create user
  const [user] = await db.insert(users).values({
    email: body.email.toLowerCase(),
    passwordHash,
    name: body.name ? { ru: body.name, uz: body.name } : { ru: 'Пользователь', uz: 'Foydalanuvchi' },
    language: body.language || 'ru',
    role: 'user',
    subscriptionStatus: 'guest',
    planId: freePlan?.id || null,
    referralCode: generateReferralCode(),
    referredBy,
    avatarLetter: (body.name || body.email)[0].toUpperCase(),
  }).returning();

  // Create default profile
  await db.insert(userProfiles).values({
    userId: user.id,
    name: body.name || 'Основной',
    isDefault: true,
  });

  // Generate tokens
  const tokens = await generateTokenPair(user.id, user.email, user.role);

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      subscriptionStatus: user.subscriptionStatus,
      referralCode: user.referralCode,
    },
    ...tokens,
  }, 201);
});

// ═══ LOGIN ═══
auth.post('/login', async (c) => {
  const db = getDb();
  const body = await c.req.json<{ email: string; password: string }>();

  if (!body.email || !body.password) {
    return c.json({ error: 'Email и пароль обязательны' }, 400);
  }

  const [user] = await db.select().from(users)
    .where(eq(users.email, body.email.toLowerCase()));

  if (!user) {
    return c.json({ error: 'Неверный email или пароль' }, 401);
  }

  if (user.isBlocked) {
    return c.json({ error: 'Аккаунт заблокирован' }, 403);
  }

  if (!user.passwordHash) {
    return c.json({ error: 'Пароль не установлен. Используйте сброс пароля.' }, 401);
  }

  const valid = await verifyPassword(body.password, user.passwordHash);
  if (!valid) {
    return c.json({ error: 'Неверный email или пароль' }, 401);
  }

  // Update last login
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

  const tokens = await generateTokenPair(user.id, user.email, user.role);

  return c.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      subscriptionStatus: user.subscriptionStatus,
      referralCode: user.referralCode,
      language: user.language,
    },
    ...tokens,
  });
});

// ═══ GOOGLE AUTH ═══
auth.post('/google', async (c) => {
  const db = getDb();
  const body = await c.req.json<{ token: string }>();

  if (!body.token) {
    return c.json({ error: 'Google token обязателен' }, 400);
  }

  // Verify Google ID token via tokeninfo endpoint
  const GOOGLE_CLIENT_ID = (c.env as any)?.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  if (!GOOGLE_CLIENT_ID) {
    return c.json({ error: 'Google auth не настроен' }, 500);
  }

  let googlePayload: { sub: string; email: string; name?: string; picture?: string; aud?: string };
  try {
    const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(body.token)}`);
    if (!verifyRes.ok) {
      return c.json({ error: 'Недействительный Google токен' }, 401);
    }
    googlePayload = await verifyRes.json() as any;
  } catch {
    return c.json({ error: 'Ошибка верификации Google токена' }, 500);
  }

  // Verify audience matches our client ID
  if (googlePayload.aud !== GOOGLE_CLIENT_ID) {
    return c.json({ error: 'Недействительный Google токен (aud mismatch)' }, 401);
  }

  if (!googlePayload.email || !googlePayload.sub) {
    return c.json({ error: 'Google токен не содержит email' }, 400);
  }

  const googleId = googlePayload.sub;
  const email = googlePayload.email.toLowerCase();

  try {
    // 1. Try to find user by google_id
    let [user] = await db.select().from(users).where(eq(users.googleId, googleId));

    if (!user) {
      // 2. Try to find by email
      [user] = await db.select().from(users).where(eq(users.email, email));

      if (user) {
        // Link Google to existing account
        await db.update(users).set({ googleId }).where(eq(users.id, user.id));
      } else {
        // 3. Create new user
        const [freePlan] = await db.select().from(plans).where(eq(plans.slug, 'basic'));
        const displayName = googlePayload.name || email.split('@')[0];

        [user] = await db.insert(users).values({
          email,
          googleId,
          name: { ru: displayName, uz: displayName },
          avatarUrl: googlePayload.picture || null,
          avatarLetter: displayName[0].toUpperCase(),
          language: 'ru',
          role: 'user',
          subscriptionStatus: 'guest',
          planId: freePlan?.id || null,
          referralCode: generateReferralCode(),
        }).returning();

        // Create default profile
        await db.insert(userProfiles).values({
          userId: user.id,
          name: displayName,
          isDefault: true,
        });
      }
    }

    if (user.isBlocked) {
      return c.json({ error: 'Аккаунт заблокирован' }, 403);
    }

    const tokens = await generateTokenPair(user.id, user.email!, user.role!);

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        subscriptionStatus: user.subscriptionStatus,
        referralCode: user.referralCode,
        language: user.language,
      },
      ...tokens,
    });
  } catch (err: any) {
    return c.json({ error: 'Ошибка сервера: ' + (err?.message || String(err)) }, 500);
  }
});

// ═══ REFRESH ═══
auth.post('/refresh', async (c) => {
  const db = getDb();
  const body = await c.req.json<{ refreshToken: string }>();

  if (!body.refreshToken) {
    return c.json({ error: 'refreshToken required' }, 400);
  }

  const payload = await verifyRefreshToken(body.refreshToken);
  if (!payload) {
    return c.json({ error: 'Недействительный refresh token', code: 'REFRESH_INVALID' }, 401);
  }

  // Get fresh user data
  const [user] = await db.select().from(users).where(eq(users.id, payload.sub));
  if (!user || user.isBlocked) {
    return c.json({ error: 'Пользователь не найден или заблокирован' }, 401);
  }

  const tokens = await generateTokenPair(user.id, user.email, user.role);
  return c.json(tokens);
});

// ═══ ME (current user) ═══
auth.get('/me', authRequired, async (c) => {
  const db = getDb();
  const userId = c.get('userId');

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return c.json({ error: 'Пользователь не найден' }, 404);

  // Get plan info
  let plan = null;
  if (user.planId) {
    const [p] = await db.select().from(plans).where(eq(plans.id, user.planId));
    plan = p;
  }

  // Profiles
  const profiles = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));

  return c.json({
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    birthDate: user.birthDate,
    gender: user.gender,
    avatarUrl: user.avatarUrl,
    role: user.role,
    language: user.language,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionEnd: user.subscriptionEnd,
    referralCode: user.referralCode,
    avatarLetter: user.avatarLetter,
    plan: plan ? { slug: plan.slug, name: plan.name, quality: plan.quality } : null,
    profiles,
  });
});

// ═══ CHANGE PASSWORD ═══
auth.post('/password', authRequired, async (c) => {
  const db = getDb();
  const userId = c.get('userId');
  const body = await c.req.json<{ currentPassword: string; newPassword: string }>();

  if (!body.currentPassword || !body.newPassword) {
    return c.json({ error: 'Текущий и новый пароли обязательны' }, 400);
  }
  if (body.newPassword.length < 6) {
    return c.json({ error: 'Новый пароль минимум 6 символов' }, 400);
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || !user.passwordHash) {
    return c.json({ error: 'Пользователь не найден' }, 404);
  }

  const valid = await verifyPassword(body.currentPassword, user.passwordHash);
  if (!valid) {
    return c.json({ error: 'Неверный текущий пароль' }, 401);
  }

  const newHash = await hashPassword(body.newPassword);
  await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, userId));

  return c.json({ ok: true, message: 'Пароль изменён' });
});

// ═══ UPDATE PROFILE ═══
auth.put('/profile', authRequired, async (c) => {
  const db = getDb();
  const userId = c.get('userId');
  const body = await c.req.json<{
    name?: string | { ru?: string; uz?: string };
    phone?: string;
    birthDate?: string;
    gender?: string;
    avatarUrl?: string;
    language?: string;
  }>();

  const updates: Record<string, any> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.phone !== undefined) updates.phone = body.phone;
  if (body.birthDate !== undefined) updates.birthDate = body.birthDate;
  if (body.gender !== undefined) updates.gender = body.gender;
  if (body.avatarUrl !== undefined) updates.avatarUrl = body.avatarUrl;
  if (body.language !== undefined) updates.language = body.language;

  if (Object.keys(updates).length === 0) {
    return c.json({ error: 'Нет данных для обновления' }, 400);
  }

  const [updated] = await db.update(users).set(updates)
    .where(eq(users.id, userId)).returning();

  if (!updated) return c.json({ error: 'Пользователь не найден' }, 404);

  return c.json({
    ok: true,
    user: {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      phone: updated.phone,
      birthDate: updated.birthDate,
      gender: updated.gender,
      avatarUrl: updated.avatarUrl,
      language: updated.language,
      subscriptionStatus: updated.subscriptionStatus,
    },
  });
});

// ═══ LOGOUT (informational — client clears tokens) ═══
auth.post('/logout', (c) => {
  return c.json({ ok: true, message: 'Удалите токены на клиенте' });
});

export default auth;
