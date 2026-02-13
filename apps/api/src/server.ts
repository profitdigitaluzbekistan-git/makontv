/**
 * MakonTV API Server (local dev)
 */
import { serve } from '@hono/node-server';
import app from './app';

const port = parseInt(process.env.PORT || '3001');

console.log(`
╔══════════════════════════════════════╗
║       MakonTV API v2.0.0             ║
║                                      ║
║  http://localhost:${port}               ║
║                                      ║
║  GET /api       → список endpoints   ║
║  GET /health    → проверка БД        ║
║                                      ║
║  ?lang=uz для узбекского языка       ║
╚══════════════════════════════════════╝
`);

serve({ fetch: app.fetch, port });
