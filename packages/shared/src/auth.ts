/**
 * MakonTV Auth Service
 *
 * JWT-based authentication:
 *   - bcrypt password hashing
 *   - Access token (15 min) + Refresh token (7 days)
 *   - Role-based access: user, editor, support, admin
 */
import { sign, verify } from 'hono/jwt';

const JWT_SECRET = process.env.JWT_SECRET || 'makontv-dev-secret-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'makontv-refresh-secret-change-in-production';

const ACCESS_TOKEN_TTL = 15 * 60;       // 15 minutes
const REFRESH_TOKEN_TTL = 7 * 24 * 3600; // 7 days

export interface TokenPayload {
  sub: string;        // user ID
  email: string;
  role: string;       // user | editor | support | admin
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

// ═══ PASSWORD HASHING ═══
// Using Web Crypto API (works in Node, Cloudflare Workers, Deno)

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${saltHex}:${hashHex}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, storedHashHex] = stored.split(':');
  if (!saltHex || !storedHashHex) return false;

  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex === storedHashHex;
}

// ═══ TOKEN GENERATION ═══

async function generateAccessToken(userId: string, email: string, role: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    sub: userId,
    email,
    role,
    type: 'access',
    iat: now,
    exp: now + ACCESS_TOKEN_TTL,
  };
  return sign(payload, JWT_SECRET);
}

async function generateRefreshToken(userId: string, email: string, role: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    sub: userId,
    email,
    role,
    type: 'refresh',
    iat: now,
    exp: now + REFRESH_TOKEN_TTL,
  };
  return sign(payload, JWT_REFRESH_SECRET);
}

async function generateTokenPair(userId: string, email: string, role: string) {
  return {
    accessToken: await generateAccessToken(userId, email, role),
    refreshToken: await generateRefreshToken(userId, email, role),
    expiresIn: ACCESS_TOKEN_TTL,
  };
}

// ═══ TOKEN VERIFICATION ═══

async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
  try {
    const payload = await verify(token, JWT_SECRET, 'HS256') as TokenPayload;
    if (payload.type !== 'access') return null;
    return payload;
  } catch {
    return null;
  }
}

async function verifyRefreshToken(token: string): Promise<TokenPayload | null> {
  try {
    const payload = await verify(token, JWT_REFRESH_SECRET, 'HS256') as TokenPayload;
    if (payload.type !== 'refresh') return null;
    return payload;
  } catch {
    return null;
  }
}

// ═══ GENERATE REFERRAL CODE ═══
function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'MK-';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export {
  hashPassword,
  verifyPassword,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  generateReferralCode,
};
