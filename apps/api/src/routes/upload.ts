/**
 * Upload API — file upload for admin panel
 *
 * POST /admin/upload              — direct upload (multipart form)
 * POST /admin/upload/presign      — get presigned URL for client-side upload
 * DELETE /admin/upload/:key       — delete a file
 * GET /admin/upload/list/:folder  — list files in folder
 *
 * Protected by admin middleware.
 */
import { Hono } from 'hono';
import {
  uploadFile, deleteFile, getUploadUrl, listFiles,
  validateUpload, publicUrl, type AssetFolder,
} from '@makontv/shared';
import { adminGuard } from '../middleware/admin';

const upload = new Hono();
upload.use('/*', adminGuard);

// Valid folders
const VALID_FOLDERS: AssetFolder[] = ['posters', 'backdrops', 'thumbnails', 'avatars', 'videos', 'trailers'];

function isValidFolder(f: string): f is AssetFolder {
  return VALID_FOLDERS.includes(f as AssetFolder);
}

// ═══ DIRECT UPLOAD ═══
// Used by admin panel for images (small files)
upload.post('/', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const folder = (formData.get('folder') as string) || 'posters';

    if (!file) return c.json({ error: 'No file provided' }, 400);
    if (!isValidFolder(folder)) return c.json({ error: `Invalid folder. Use: ${VALID_FOLDERS.join(', ')}` }, 400);

    // Validate
    const err = validateUpload(file.type, file.size, folder);
    if (err) return c.json({ error: err }, 400);

    // Upload
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadFile(folder, file.name, buffer, file.type, file.size);

    return c.json({
      success: true,
      ...result,
    }, 201);
  } catch (err: any) {
    // If S3 not configured, return helpful error
    if (err.message?.includes('S3_ENDPOINT')) {
      return c.json({
        error: 'Storage not configured',
        hint: 'Set S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET, S3_PUBLIC_URL in .env',
        docs: 'See README for Cloudflare R2 setup instructions',
      }, 503);
    }
    return c.json({ error: err.message }, 500);
  }
});

// ═══ PRESIGNED UPLOAD URL ═══
// Used for large files (videos) — client uploads directly to R2
upload.post('/presign', async (c) => {
  try {
    const body = await c.req.json<{
      filename: string;
      contentType: string;
      folder: AssetFolder;
      size?: number;
    }>();

    if (!body.filename || !body.contentType) {
      return c.json({ error: 'filename and contentType required' }, 400);
    }
    if (!isValidFolder(body.folder)) {
      return c.json({ error: `Invalid folder. Use: ${VALID_FOLDERS.join(', ')}` }, 400);
    }

    // Validate
    if (body.size) {
      const err = validateUpload(body.contentType, body.size, body.folder);
      if (err) return c.json({ error: err }, 400);
    }

    const result = await getUploadUrl(body.folder, body.filename, body.contentType);

    return c.json({
      success: true,
      uploadUrl: result.uploadUrl,   // Client PUTs file here
      key: result.key,               // Save this in DB
      publicUrl: result.publicUrl,   // Use this to display
    });
  } catch (err: any) {
    if (err.message?.includes('S3_ENDPOINT')) {
      return c.json({
        error: 'Storage not configured',
        hint: 'Set S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY in .env',
      }, 503);
    }
    return c.json({ error: err.message }, 500);
  }
});

// ═══ DELETE FILE ═══
upload.delete('/:folder/:filename', async (c) => {
  try {
    const folder = c.req.param('folder');
    const filename = c.req.param('filename');
    const key = `${folder}/${filename}`;

    await deleteFile(key);
    return c.json({ success: true, deleted: key });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ═══ LIST FILES ═══
upload.get('/list/:folder', async (c) => {
  try {
    const folder = c.req.param('folder');
    if (!isValidFolder(folder)) {
      return c.json({ error: 'Invalid folder' }, 400);
    }

    const files = await listFiles(folder);
    return c.json({
      folder,
      files: files.map(key => ({
        key,
        url: publicUrl(key),
      })),
      count: files.length,
    });
  } catch (err: any) {
    if (err.message?.includes('S3_ENDPOINT')) {
      return c.json({ error: 'Storage not configured' }, 503);
    }
    return c.json({ error: err.message }, 500);
  }
});

export default upload;
