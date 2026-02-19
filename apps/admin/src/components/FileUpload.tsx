/**
 * FileUpload — direct browser-to-Bunny upload component.
 *
 * Images: API /admin/upload/sign → direct PUT to Bunny Storage
 * Video:  API /admin/upload/video/create → direct PUT to Bunny Stream
 *
 * Bypasses Vercel 4.5MB body limit by uploading directly from browser.
 */
import React, { useState, useEffect } from 'react';
import { Upload, Button, Input, Space, Image, Progress, message, Tabs, Typography, Tag } from 'antd';
import { UploadOutlined, LinkOutlined, CloudUploadOutlined, PlayCircleOutlined, CheckCircleOutlined, SyncOutlined } from '@ant-design/icons';
import { getAdminSecret } from '../providers/dataProvider';

const { Text } = Typography;
const API_BASE = import.meta.env.VITE_API_URL || '';

interface FileUploadProps {
  value?: string;
  onChange?: (url: string) => void;
  folder?: string;
  accept?: string;
  videoMode?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  value = '',
  onChange,
  folder = 'posters',
  accept = 'image/*',
  videoMode = false,
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [urlInput, setUrlInput] = useState(value || '');
  const [activeTab, setActiveTab] = useState<string>(value?.startsWith('http') ? 'url' : 'upload');
  const [videoStatus, setVideoStatus] = useState<string | null>(null);
  const [statusPolling, setStatusPolling] = useState(false);

  const isImage = accept.startsWith('image');

  // Poll Bunny video status after upload
  useEffect(() => {
    if (!statusPolling || !value) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/admin/upload/video/${value}`, {
          headers: { 'X-Admin-Secret': getAdminSecret() },
        });
        const data = await res.json();
        if (data.status === 'ready') {
          setVideoStatus('ready');
          setStatusPolling(false);
          message.success('Видео готово к воспроизведению');
        } else if (data.status === 'error') {
          setVideoStatus('error');
          setStatusPolling(false);
          message.error('Ошибка обработки видео');
        } else {
          setVideoStatus(data.status);
        }
      } catch {
        // ignore polling errors
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [statusPolling, value]);

  // Image upload: get signed URL from API, then PUT directly to Bunny Storage
  const handleImageUpload = async (file: File) => {
    setUploading(true);
    setProgress(0);

    try {
      // Step 1: Get signed upload URL from API (small JSON request, no file body)
      const signRes = await fetch(`${API_BASE}/admin/upload/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Secret': getAdminSecret(),
        },
        body: JSON.stringify({ folder, contentType: file.type, filename: file.name }),
      });

      if (!signRes.ok) {
        const err = await signRes.json().catch(() => ({ error: `HTTP ${signRes.status}` }));
        throw new Error(err.error || 'Не удалось получить URL для загрузки');
      }

      const { uploadUrl, cdnUrl, accessKey } = await signRes.json();

      // Step 2: Upload file directly to Bunny Storage (browser → Bunny, bypasses Vercel)
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('AccessKey', accessKey);
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
          }
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(file);
      });

      onChange?.(cdnUrl);
      setUrlInput(cdnUrl);
      message.success('Изображение загружено');
    } catch (err: any) {
      message.error('Ошибка: ' + (err.message || 'Загрузка не удалась'));
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 500);
    }

    return false;
  };

  // Video upload: create video via API, then PUT directly to Bunny Stream
  const handleVideoUpload = async (file: File) => {
    setUploading(true);
    setProgress(0);

    try {
      // Step 1: Create video in Bunny Stream via API (small JSON request)
      message.info('Создание видео...');
      const createRes = await fetch(`${API_BASE}/admin/upload/video/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Secret': getAdminSecret(),
        },
        body: JSON.stringify({ title: file.name.replace(/\.[^.]+$/, '') }),
      });

      const createData = await createRes.json();
      if (!createRes.ok) {
        message.error(createData.error || 'Не удалось создать видео');
        return false;
      }

      const { videoId, uploadUrl, accessKey } = createData;

      // Step 2: Upload video directly to Bunny Stream (browser → Bunny, bypasses Vercel)
      message.info('Загрузка видео...');
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('AccessKey', accessKey);
      xhr.setRequestHeader('Content-Type', 'application/octet-stream');

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            onChange?.(videoId);
            setUrlInput(videoId);
            setVideoStatus('processing');
            setStatusPolling(true);
            message.success('Видео загружено, идёт обработка...');
            resolve();
          } else {
            reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
          }
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(file);
      });
    } catch (err: any) {
      message.error('Ошибка: ' + (err.message || 'Загрузка не удалась'));
    } finally {
      setUploading(false);
      setTimeout(() => setProgress(0), 500);
    }

    return false;
  };

  // URL input
  const handleUrlChange = (url: string) => {
    setUrlInput(url);
    onChange?.(url);
  };

  const videoStatusTag = videoStatus ? (
    <div style={{ marginTop: 8 }}>
      {videoStatus === 'ready' && <Tag icon={<CheckCircleOutlined />} color="success">Готово к воспроизведению</Tag>}
      {videoStatus === 'processing' && <Tag icon={<SyncOutlined spin />} color="processing">Обработка...</Tag>}
      {videoStatus === 'transcoding' && <Tag icon={<SyncOutlined spin />} color="processing">Транскодирование...</Tag>}
      {videoStatus === 'uploaded' && <Tag icon={<SyncOutlined spin />} color="processing">Загружено, ожидание обработки...</Tag>}
      {videoStatus === 'error' && <Tag color="error">Ошибка обработки</Tag>}
    </div>
  ) : null;

  const items = [
    {
      key: 'upload',
      label: <><CloudUploadOutlined /> Загрузить</>,
      children: (
        <div>
          <Upload
            beforeUpload={videoMode ? handleVideoUpload : handleImageUpload}
            customRequest={() => {}}
            showUploadList={false}
            accept={accept}
            maxCount={1}
          >
            <Button icon={<UploadOutlined />} loading={uploading} block>
              {uploading ? 'Загрузка...' : `Выбрать ${isImage ? 'изображение' : 'видео'}`}
            </Button>
          </Upload>
          {uploading && <Progress percent={progress} size="small" style={{ marginTop: 8 }} />}
          {value && isImage && !videoMode && (
            <div style={{ marginTop: 8 }}>
              <Image src={value} width={120} height={80} style={{ objectFit: 'cover', borderRadius: 4 }} />
            </div>
          )}
          {value && videoMode && (
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                <PlayCircleOutlined /> Video ID: {value}
              </Text>
              {videoStatusTag}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'url',
      label: <><LinkOutlined /> URL</>,
      children: (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input
            placeholder={isImage ? 'https://example.com/poster.jpg' : 'https://youtube.com/watch?v=... или .m3u8 ссылка'}
            value={urlInput}
            onChange={(e) => handleUrlChange(e.target.value)}
          />
          {urlInput && isImage && !videoMode && (
            <Image src={urlInput} width={120} height={80} style={{ objectFit: 'cover', borderRadius: 4 }}
              fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iODAiIGZpbGw9IiMzMzMiLz48dGV4dCB4PSI2MCIgeT0iNDAiIGZpbGw9IiM2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIiBmb250LXNpemU9IjEyIj5ObyBpbWFnZTwvdGV4dD48L3N2Zz4=" />
          )}
        </Space>
      ),
    },
  ];

  return (
    <Tabs activeKey={activeTab} onChange={setActiveTab} items={items} size="small" />
  );
};
