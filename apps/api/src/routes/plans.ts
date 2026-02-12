/**
 * GET /api/plans — список тарифов
 */
import { Hono } from 'hono';
import { plans } from '@makontv/db';
import { getDb } from '../db';
import { getLang, localizeObj, localizeArray } from '../helpers';

const plansRoute = new Hono();

plansRoute.get('/', async (c) => {
  const db = getDb();
  const lang = getLang(c);

  const result = await db.select().from(plans).orderBy(plans.sortOrder);
  return c.json(result.map(p => ({
    ...localizeObj(p, lang, ['name', 'priceLabel']),
    features: localizeArray(p.features as any[], lang),
  })));
});

export default plansRoute;
