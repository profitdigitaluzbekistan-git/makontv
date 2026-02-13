/**
 * Vercel serverless entry point for MakonTV API
 *
 * Uses raw Node.js handler instead of @hono/node-server/vercel
 * to avoid POST body streaming issues.
 */
import type { IncomingMessage, ServerResponse } from 'http';
import app from './app';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // Read body for non-GET requests
  const body = await new Promise<Buffer>((resolve) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      return resolve(Buffer.alloc(0));
    }
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });

  // Build Web API Request
  const url = `https://${req.headers.host || 'localhost'}${req.url || '/'}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  }

  const requestInit: RequestInit = {
    method: req.method || 'GET',
    headers,
  };
  if (body.length > 0) {
    requestInit.body = body;
  }

  const request = new Request(url, requestInit);

  // Call Hono
  const response = await app.fetch(request);

  // Write response
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  const responseBody = await response.arrayBuffer();
  res.end(Buffer.from(responseBody));
}
