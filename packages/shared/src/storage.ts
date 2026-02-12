/**
 * MakonTV Storage Service
 *
 * S3-compatible object storage for images and video files.
 * Works with: Cloudflare R2, AWS S3, MinIO, Supabase Storage.
 *
 * Folder structure in bucket:
 *   posters/    — movie/series poster images
 *   backdrops/  — hero backgrounds
 *   thumbnails/ — episode thumbnails
 *   avatars/    — user/person photos
 *   videos/     — uploaded video files (MP4)
 *   trailers/   — trailer video files
 */
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// ═══ CONFIG ═══
const BUCKET = process.env.S3_BUCKET || 'makontv';
const PUBLIC_URL = process.env.S3_PUBLIC_URL || '';  // e.g. https://pub-xxx.r2.dev or CDN URL

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (!_client) {
    const endpoint = process.env.S3_ENDPOINT;
    if (!endpoint) {
      throw new Error('S3_ENDPOINT is not configured. Set it in .env');
    }
    _client = new S3Client({
      region: process.env.S3_REGION || 'auto',
      endpoint,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || '',
        secretAccessKey: process.env.S3_SECRET_KEY || '',
      },
      // R2 compatibility
      forcePathStyle: true,
    });
  }
  return _client;
}

// ═══ TYPES ═══
export type AssetFolder = 'posters' | 'backdrops' | 'thumbnails' | 'avatars' | 'videos' | 'trailers';

export interface UploadResult {
  key: string;        // full path in bucket: "posters/abc123.jpg"
  url: string;        // public URL
  size: number;
  contentType: string;
}

// ═══ UPLOAD ═══
export async function uploadFile(
  folder: AssetFolder,
  filename: string,
  body: Buffer | Uint8Array | ReadableStream,
  contentType: string,
  size: number,
): Promise<UploadResult> {
  const client = getClient();

  // Generate unique filename
  const ext = filename.split('.').pop() || '';
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const key = `${folder}/${uniqueName}`;

  await client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
    // Make publicly readable
    // Note: For R2, public access is configured at bucket level
  }));

  const url = PUBLIC_URL ? `${PUBLIC_URL}/${key}` : key;

  return { key, url, size, contentType };
}

// ═══ DELETE ═══
export async function deleteFile(key: string): Promise<void> {
  const client = getClient();
  await client.send(new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  }));
}

// ═══ GET SIGNED URL (for private files) ═══
export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  const client = getClient();
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(client, command, { expiresIn });
}

// ═══ GENERATE UPLOAD URL (for client-side uploads) ═══
export async function getUploadUrl(
  folder: AssetFolder,
  filename: string,
  contentType: string,
  expiresIn = 600,
): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
  const client = getClient();
  const ext = filename.split('.').pop() || '';
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const key = `${folder}/${uniqueName}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(client, command, { expiresIn });
  const publicUrl = PUBLIC_URL ? `${PUBLIC_URL}/${key}` : key;

  return { uploadUrl, key, publicUrl };
}

// ═══ LIST FILES ═══
export async function listFiles(folder: AssetFolder, maxKeys = 100): Promise<string[]> {
  const client = getClient();
  const result = await client.send(new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: `${folder}/`,
    MaxKeys: maxKeys,
  }));
  return (result.Contents || []).map(obj => obj.Key || '');
}

// ═══ FILE EXISTS ═══
export async function fileExists(key: string): Promise<boolean> {
  try {
    const client = getClient();
    await client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

// ═══ HELPER: Get public URL for a key ═══
export function publicUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  if (key.startsWith('http')) return key;  // already a full URL
  return PUBLIC_URL ? `${PUBLIC_URL}/${key}` : null;
}

// ═══ VALIDATION ═══
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;   // 10MB
const MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

export function validateUpload(contentType: string, size: number, folder: AssetFolder): string | null {
  if (folder === 'videos' || folder === 'trailers') {
    if (!ALLOWED_VIDEO_TYPES.includes(contentType)) {
      return `Недопустимый тип видео: ${contentType}. Разрешены: ${ALLOWED_VIDEO_TYPES.join(', ')}`;
    }
    if (size > MAX_VIDEO_SIZE) {
      return `Файл слишком большой: ${(size / 1024 / 1024).toFixed(0)}MB. Максимум: 2GB`;
    }
  } else {
    if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
      return `Недопустимый тип изображения: ${contentType}. Разрешены: ${ALLOWED_IMAGE_TYPES.join(', ')}`;
    }
    if (size > MAX_IMAGE_SIZE) {
      return `Файл слишком большой: ${(size / 1024 / 1024).toFixed(0)}MB. Максимум: 10MB`;
    }
  }
  return null;
}
