/**
 * Email Notification Service
 *
 * Uses Resend API (resend.com) — 100 free emails/day.
 * Sends: welcome, new content, subscription confirmation, password reset.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'MakonTV <noreply@makontv.uz>';

interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not set, skipping email to', params.to);
    return false;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [params.to],
        subject: params.subject,
        html: params.html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[Email] Failed:', err);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Email] Error:', err);
    return false;
  }
}

// ═══ TEMPLATES ═══

const BRAND_COLOR = '#6bf1f6';
const BG_COLOR = '#0a0a14';

function wrap(content: string): string {
  return `
  <div style="max-width:600px;margin:0 auto;background:${BG_COLOR};color:#fff;font-family:-apple-system,BlinkMacSystemFont,sans-serif;padding:32px;border-radius:16px">
    <div style="text-align:center;margin-bottom:24px">
      <span style="font-size:28px;font-weight:800;color:${BRAND_COLOR}">MakonTV</span>
    </div>
    ${content}
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #333;text-align:center;color:#666;font-size:12px">
      MakonTV — Стриминг из Узбекистана<br>
      <a href="https://makontv.uz" style="color:${BRAND_COLOR}">makontv.uz</a>
    </div>
  </div>`;
}

export function welcomeEmail(name: string): EmailParams & { subject: string; html: string } {
  return {
    to: '',
    subject: 'Добро пожаловать в MakonTV! 🎬',
    html: wrap(`
      <h2 style="color:#fff;margin:0 0 16px">Привет, ${name}!</h2>
      <p style="color:#ccc;line-height:1.6">Добро пожаловать в MakonTV — стриминговый сервис с фильмами и сериалами из Узбекистана.</p>
      <p style="color:#ccc;line-height:1.6">Что вас ждёт:</p>
      <ul style="color:#ccc;line-height:1.8">
        <li>Оригинальные фильмы в 4K качестве</li>
        <li>Эксклюзивные сериалы</li>
        <li>Два языка: русский и ўзбек</li>
      </ul>
      <div style="text-align:center;margin:24px 0">
        <a href="https://makontv.uz/#catalog-films" style="display:inline-block;background:${BRAND_COLOR};color:${BG_COLOR};padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px">Начать смотреть</a>
      </div>
    `),
  };
}

export function newContentEmail(title: string, type: 'movie' | 'episode', slug: string): Omit<EmailParams, 'to'> {
  const label = type === 'movie' ? 'Новый фильм' : 'Новая серия';
  return {
    subject: `${label}: ${title} 🎬`,
    html: wrap(`
      <h2 style="color:#fff;margin:0 0 16px">${label} уже доступен!</h2>
      <p style="color:#ccc;font-size:18px;line-height:1.6"><strong>${title}</strong></p>
      <div style="text-align:center;margin:24px 0">
        <a href="https://makontv.uz/#${type === 'movie' ? 'detail' : 'series-detail'}" style="display:inline-block;background:${BRAND_COLOR};color:${BG_COLOR};padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700">Смотреть сейчас</a>
      </div>
    `),
  };
}

export function subscriptionEmail(planName: string, endDate: string): Omit<EmailParams, 'to'> {
  return {
    subject: 'Подписка активирована ✅',
    html: wrap(`
      <h2 style="color:#fff;margin:0 0 16px">Подписка активирована!</h2>
      <p style="color:#ccc;line-height:1.6">Ваш тариф: <strong style="color:${BRAND_COLOR}">${planName}</strong></p>
      <p style="color:#ccc;line-height:1.6">Действует до: <strong>${endDate}</strong></p>
      <p style="color:#ccc;line-height:1.6">Теперь вам доступны все фильмы и сериалы без рекламы в максимальном качестве.</p>
    `),
  };
}
