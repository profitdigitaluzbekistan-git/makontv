/**
 * Subscription API
 *
 * POST /api/subscriptions/checkout    — начать подписку (prepare payment)
 * POST /api/subscriptions/activate    — активировать (после оплаты)
 * POST /api/subscriptions/cancel      — отменить подписку
 * GET  /api/subscriptions/status      — текущий статус
 * POST /api/subscriptions/webhook     — webhook от платёжной системы
 *
 * Платёжная интеграция:
 *   Click.uz / Payme.uz — две основные платёжные системы в Узбекистане.
 *   Webhook принимает подтверждение оплаты и активирует подписку.
 */
import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { users, plans } from '@makontv/db';
import { getDb } from '../db';
import { authRequired } from '../middleware/auth';

const subscriptions = new Hono();

// ═══ CHECKOUT (prepare payment) ═══
subscriptions.post('/checkout', authRequired, async (c) => {
  const db = getDb();
  const userId = c.get('userId');
  const body = await c.req.json<{ planSlug: string; period?: 'monthly' | 'annual' }>();

  const [plan] = await db.select().from(plans).where(eq(plans.slug, body.planSlug));
  if (!plan) return c.json({ error: 'Тариф не найден' }, 404);

  if (plan.price === 0) {
    // Free plan — activate immediately
    await db.update(users).set({
      planId: plan.id,
      subscriptionStatus: 'active',
    }).where(eq(users.id, userId));

    return c.json({
      status: 'activated',
      plan: plan.slug,
      message: 'Бесплатный тариф активирован',
    });
  }

  const period = body.period || 'monthly';
  const amount = period === 'annual' ? plan.price * 10 : plan.price; // 10 months for annual

  // Generate payment data for Click.uz / Payme.uz
  // In production: create payment order in DB, generate payment URL
  const orderId = `MK-${Date.now()}-${userId.slice(0, 8)}`;

  return c.json({
    status: 'pending',
    orderId,
    amount,
    currency: 'UZS',
    plan: plan.slug,
    period,
    // Payment URLs (placeholders — replace with real integration)
    paymentUrls: {
      click: `https://my.click.uz/services/pay?merchant_id=MERCHANT&amount=${amount}&transaction_param=${orderId}`,
      payme: `https://checkout.paycom.uz/${Buffer.from(JSON.stringify({
        m: 'MERCHANT_ID',
        ac: { order_id: orderId },
        a: amount * 100,
      })).toString('base64')}`,
    },
    message: 'Перейдите по ссылке для оплаты',
  });
});

// ═══ ACTIVATE (after payment confirmed) ═══
subscriptions.post('/activate', authRequired, async (c) => {
  const db = getDb();
  const userId = c.get('userId');
  const body = await c.req.json<{
    planSlug: string;
    orderId: string;
    period?: 'monthly' | 'annual';
  }>();

  const [plan] = await db.select().from(plans).where(eq(plans.slug, body.planSlug));
  if (!plan) return c.json({ error: 'Тариф не найден' }, 404);

  const period = body.period || 'monthly';
  const daysToAdd = period === 'annual' ? 365 : 30;

  const now = new Date();
  const end = new Date(now.getTime() + daysToAdd * 24 * 3600 * 1000);

  await db.update(users).set({
    planId: plan.id,
    subscriptionStatus: 'active',
    subscriptionEnd: end,
  }).where(eq(users.id, userId));

  return c.json({
    status: 'active',
    plan: plan.slug,
    subscriptionEnd: end.toISOString(),
    message: `Подписка ${plan.name?.ru || plan.slug} активирована до ${end.toLocaleDateString('ru')}`,
  });
});

// ═══ CANCEL ═══
subscriptions.post('/cancel', authRequired, async (c) => {
  const db = getDb();
  const userId = c.get('userId');

  // Find free plan
  const [freePlan] = await db.select().from(plans).where(eq(plans.slug, 'basic'));

  await db.update(users).set({
    planId: freePlan?.id || null,
    subscriptionStatus: 'expired',
    // Keep subscriptionEnd — user can watch until it expires
  }).where(eq(users.id, userId));

  return c.json({
    status: 'cancelled',
    message: 'Подписка отменена. Доступ сохранится до конца оплаченного периода.',
  });
});

// ═══ STATUS ═══
subscriptions.get('/status', authRequired, async (c) => {
  const db = getDb();
  const userId = c.get('userId');

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return c.json({ error: 'User not found' }, 404);

  let plan = null;
  if (user.planId) {
    [plan] = await db.select().from(plans).where(eq(plans.id, user.planId));
  }

  // Check if expired
  const isExpired = user.subscriptionEnd && new Date(user.subscriptionEnd) < new Date();
  const status = isExpired ? 'expired' : user.subscriptionStatus;

  return c.json({
    status,
    plan: plan ? { slug: plan.slug, name: plan.name, quality: plan.quality, hasAds: plan.hasAds } : null,
    subscriptionEnd: user.subscriptionEnd,
    isExpired,
  });
});

// ═══ WEBHOOK (from payment provider) ═══
subscriptions.post('/webhook', async (c) => {
  const db = getDb();
  const body = await c.req.json();

  // Verify webhook signature (provider-specific)
  // For Click.uz: verify sign_string
  // For Payme.uz: verify request from Payme IP

  const { orderId, status, userId, planSlug } = body;

  if (status === 'paid' && userId && planSlug) {
    const [plan] = await db.select().from(plans).where(eq(plans.slug, planSlug));
    if (!plan) return c.json({ error: 'Plan not found' }, 404);

    const end = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    await db.update(users).set({
      planId: plan.id,
      subscriptionStatus: 'active',
      subscriptionEnd: end,
    }).where(eq(users.id, userId));

    return c.json({ ok: true });
  }

  return c.json({ ok: true }); // always 200 for webhooks
});

export default subscriptions;
