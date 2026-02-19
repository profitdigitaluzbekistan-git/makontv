/**
 * Upload API — Bunny Storage (images) + Bunny Stream (video)
 *
 * POST /admin/upload/sign          — get signed URL for direct browser→Bunny Storage upload
 * DELETE /admin/upload/:folder/:filename — delete image from Bunny Storage
 * POST /admin/upload/video/create  — create video in Bunny Stream (returns direct upload URL)
 * GET  /admin/upload/video/:videoId — get video status from Bunny Stream
 * DELETE /admin/upload/video/:videoId — delete video from Bunny Stream
 *
 * Protected by admin middleware.
 */
import { Hono } from 'hono';
import { adminGuard } from '../middleware/admin';

const upload = new Hono();
upload.use('/*', adminGuard);

// ═══════════════════════════════════════
// BUNNY STORAGE (images)
// ═══════════════════════════════════════

const IMAGE_FOLDERS = ['posters', 'backdrops', 'thumbnails', 'avatars', 'banners'];

function getBunnyStorageConfig() {
  const zone = process.env.BUNNY_STORAGE_ZONE;
  const apiKey = process.env.BUNNY_STORAGE_API_KEY;
  const cdnHost = process.env.BUNNY_STORAGE_CDN_HOST;

  if (!zone || !apiKey || !cdnHost) {
    throw new Error('Bunny Storage не настроен. Установите BUNNY_STORAGE_ZONE, BUNNY_STORAGE_API_KEY, BUNNY_STORAGE_CDN_HOST');
  }
  return { zone, apiKey, cdnHost };
}

function getExtFromType(contentType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/png': 'png',
    'image/webp': 'webp', 'image/avif': 'avif',
  };
  return map[contentType] || 'jpg';
}

async function uploadToBunnyStorage(
  buffer: Buffer,
  contentType: string,
  folder: string,
  filenameHint?: string,
): Promise<{ url: string; path: string }> {
  const { zone, apiKey, cdnHost } = getBunnyStorageConfig();

  const ext = getExtFromType(contentType);
  const uniqueName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const filePath = `${folder}/${filenameHint ? filenameHint + '_' : ''}${uniqueName}`;

  const res = await fetch(`https://storage.bunnycdn.com/${zone}/${filePath}`, {
    method: 'PUT',
    headers: {
      'AccessKey': apiKey,
      'Content-Type': 'application/octet-stream',
    },
    body: buffer,
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error('Bunny Storage error: ' + errBody);
  }

  const url = `https://${cdnHost}/${filePath}`;
  return { url, path: filePath };
}

// ═══ SIGN URL for direct browser upload to Bunny Storage ═══
upload.post('/sign', async (c) => {
  try {
    const { zone, apiKey, cdnHost } = getBunnyStorageConfig();
    const body = await c.req.json<{ folder?: string; contentType?: string; filename?: string }>();
    const folder = body.folder || 'posters';

    if (!IMAGE_FOLDERS.includes(folder)) {
      return c.json({ error: `Недопустимая папка. Используйте: ${IMAGE_FOLDERS.join(', ')}` }, 400);
    }

    const ext = getExtFromType(body.contentType || 'image/jpeg');
    const uniqueName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filePath = `${folder}/${uniqueName}`;

    return c.json({
      uploadUrl: `https://storage.bunnycdn.com/${zone}/${filePath}`,
      cdnUrl: `https://${cdnHost}/${filePath}`,
      accessKey: apiKey,
      path: filePath,
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Ошибка' }, 500);
  }
});

// ═══ DELETE IMAGE ═══
upload.delete('/:folder/:filename', async (c) => {
  try {
    const { zone, apiKey } = getBunnyStorageConfig();
    const folder = c.req.param('folder');
    const filename = c.req.param('filename');
    const filePath = `${folder}/${filename}`;

    const res = await fetch(`https://storage.bunnycdn.com/${zone}/${filePath}`, {
      method: 'DELETE',
      headers: { 'AccessKey': apiKey },
    });

    if (!res.ok && res.status !== 404) {
      const errBody = await res.text();
      return c.json({ error: 'Delete error: ' + errBody }, 500);
    }

    return c.json({ success: true, deleted: filePath });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ═══════════════════════════════════════
// BUNNY STREAM (video)
// ═══════════════════════════════════════

const BUNNY_VIDEO_API = 'https://video.bunnycdn.com';

function getBunnyStreamConfig() {
  const libraryId = process.env.BUNNY_LIBRARY_ID;
  const apiKey = process.env.BUNNY_STREAM_API_KEY;
  const cdnHost = process.env.BUNNY_STREAM_CDN_HOST;

  if (!libraryId || !apiKey) {
    throw new Error('Bunny Stream не настроен. Установите BUNNY_LIBRARY_ID, BUNNY_STREAM_API_KEY, BUNNY_STREAM_CDN_HOST');
  }
  return { libraryId, apiKey, cdnHost };
}

// ═══ CREATE VIDEO (returns direct upload URL for browser→Bunny Stream) ═══
upload.post('/video/create', async (c) => {
  try {
    const { libraryId, apiKey } = getBunnyStreamConfig();
    const body = await c.req.json<{ title: string }>();

    if (!body.title) return c.json({ error: 'title обязателен' }, 400);

    const res = await fetch(`${BUNNY_VIDEO_API}/library/${libraryId}/videos`, {
      method: 'POST',
      headers: { 'AccessKey': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: body.title }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return c.json({ error: 'Bunny Stream error: ' + errBody }, res.status as any);
    }

    const video = await res.json() as { guid: string; title: string; status: number };
    return c.json({
      success: true,
      videoId: video.guid,
      title: video.title,
      status: video.status,
      uploadUrl: `${BUNNY_VIDEO_API}/library/${libraryId}/videos/${video.guid}`,
      accessKey: apiKey,
    }, 201);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ═══ GET VIDEO STATUS ═══
upload.get('/video/:videoId', async (c) => {
  try {
    const { libraryId, apiKey, cdnHost } = getBunnyStreamConfig();
    const videoId = c.req.param('videoId');

    const res = await fetch(`${BUNNY_VIDEO_API}/library/${libraryId}/videos/${videoId}`, {
      headers: { 'AccessKey': apiKey },
    });

    if (!res.ok) return c.json({ error: 'Video not found' }, 404);

    const video = await res.json() as {
      guid: string; title: string; status: number;
      length: number; width: number; height: number;
      availableResolutions: string;
    };

    const statusLabels: Record<number, string> = {
      0: 'created', 1: 'uploaded', 2: 'processing', 3: 'transcoding', 4: 'ready', 5: 'error',
    };

    return c.json({
      videoId: video.guid,
      title: video.title,
      status: statusLabels[video.status] || 'unknown',
      statusCode: video.status,
      duration: video.length,
      width: video.width,
      height: video.height,
      resolutions: video.availableResolutions,
      hlsUrl: cdnHost ? `https://${cdnHost}/${video.guid}/playlist.m3u8` : null,
      thumbnailUrl: cdnHost ? `https://${cdnHost}/${video.guid}/thumbnail.jpg` : null,
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ═══ DELETE VIDEO ═══
upload.delete('/video/:videoId', async (c) => {
  try {
    const { libraryId, apiKey } = getBunnyStreamConfig();
    const videoId = c.req.param('videoId');

    const res = await fetch(`${BUNNY_VIDEO_API}/library/${libraryId}/videos/${videoId}`, {
      method: 'DELETE',
      headers: { 'AccessKey': apiKey },
    });

    if (!res.ok && res.status !== 404) {
      const errBody = await res.text();
      return c.json({ error: 'Delete error: ' + errBody }, res.status as any);
    }

    return c.json({ success: true, deleted: videoId });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ═══ REUSABLE: Upload to Bunny Storage (exported for use in auth.ts) ═══
export { uploadToBunnyStorage, getBunnyStorageConfig };

export default upload;
