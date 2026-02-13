/**
 * Vercel serverless entry point for MakonTV API
 */
import { handle } from '@hono/node-server/vercel';
import app from './app';

export default handle(app);
