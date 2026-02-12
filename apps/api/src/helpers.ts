/**
 * API Helpers — i18n, pagination, response formatting
 */
import type { Context } from 'hono';

// ═══ I18N ═══
export type Lang = 'ru' | 'uz';

/**
 * Extract language from query param or Accept-Language header.
 * Usage: GET /api/movies?lang=uz
 */
export function getLang(c: Context): Lang {
  const q = c.req.query('lang');
  if (q === 'uz') return 'uz';
  return 'ru';
}

/**
 * Localize a JSONB field: { ru: "Фильм", uz: "Film" } → "Фильм" (if lang=ru)
 * Falls back to 'ru' if requested lang is missing.
 */
export function localize(field: any, lang: Lang): string {
  if (!field) return '';
  if (typeof field === 'string') return field;
  return field[lang] || field['ru'] || '';
}

/**
 * Localize all JSONB fields in an object.
 * Mutates in place for performance.
 */
export function localizeObj<T extends Record<string, any>>(
  obj: T,
  lang: Lang,
  fields: string[]
): T {
  const result = { ...obj };
  for (const f of fields) {
    if (result[f] !== undefined) {
      (result as any)[f] = localize(result[f], lang);
    }
  }
  return result;
}

/**
 * Localize an array of JSONB items (e.g. features).
 */
export function localizeArray(arr: any[], lang: Lang): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.map(item => localize(item, lang));
}

// ═══ PAGINATION ═══
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export function getPagination(c: Context, defaultLimit = 20): PaginationParams {
  const page = Math.max(1, parseInt(c.req.query('page') || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query('limit') || String(defaultLimit))));
  return { page, limit, offset: (page - 1) * limit };
}

export function paginatedResponse(data: any[], total: number, params: PaginationParams) {
  return {
    data,
    pagination: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.ceil(total / params.limit),
    },
  };
}
