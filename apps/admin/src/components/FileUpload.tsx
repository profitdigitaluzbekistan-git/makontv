/**
 * FileUpload — upload component for admin panel.
 *
 * Usage in forms:
 *   <Form.Item label="Постер" name="posterUrl">
 *     <FileUpload folder="posters" accept="image/*" />
 *   </Form.Item>
 *
 * For video:
 *   <Form.Item label="Видео" name="videoUrl">
 *     <FileUpload folder="videos" accept="video/*" presigned />
 *   </Form.Item>
 */
import React, { useState } from 'react';
import { Upload, Button, Input, Space, Image, Progress, message, Tabs, Typography } from 'antd';
import { UploadOutlined, LinkOutlined, CloudUploadOutlined } from '@ant-design/icons';
import { getAdminSecret } from '../providers/dataProvider';

const { Text } = Typography;
const API_BASE = import.meta.env.VITE_API_URL || '';

interface FileUploadProps {
  value?: string;
  onChange?: (url: string) => void;
  folder?: string;
  accept?: string;
  presigned?: boolean;  // Use presigned URL for large files (videos)
}

export const FileUpload: React.FC<FileUploadProps> = ({
  value = '',
  onChange,
  folder = 'posters',
  accept = 'image/*',
  presigned = false,
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [urlInput, setUrlInput] = useState(value || '');
  const [activeTab, setActiveTab] = useState<string>(value?.startsWith('http') ? 'url' : 'upload');

  const isImage = accept.startsWith('image');

  // Direct upload (images, small files)
  const handleDirectUpload = async (file: File) => {
    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const res = await fetch(`${API_BASE}/admin/upload`, {
        method: 'POST',
        headers: { 'X-Admin-Secret': getAdminSecret() },
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        onChange?.(data.url);
        setUrlInput(data.url);
        message.success('Файл загружен');
      } else {
        const errMsg = data.error || 'Ошибка загрузки';
        if (errMsg.includes('not configured') || errMsg.includes('S3') || errMsg.includes('R2') || res.status === 501 || res.status === 503) {
          message.warning('Хранилище не настроено. Используйте вкладку «URL» для вставки ссылки.');
          setActiveTab('url');
        } else {
          message.error(errMsg);
        }
      }
    } catch (err: any) {
      message.error('Хранилище не настроено или недоступно. Используйте вкладку «URL».');
      setActiveTab('url');
    } finally {
      setUploading(false);
      setProgress(0);
    }

    return false; // prevent default antd upload
  };

  // Presigned upload (videos, large files)
  const handlePresignedUpload = async (file: File) => {
    setUploading(true);
    setProgress(0);

    try {
      // 1. Get presigned URL
      const presignRes = await fetch(`${API_BASE}/admin/upload/presign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Secret': getAdminSecret(),
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          folder,
          size: file.size,
        }),
      });

      const presignData = await presignRes.json();
      if (!presignRes.ok) {
        const errMsg = presignData.error || 'Не удалось получить URL для загрузки';
        if (errMsg.includes('not configured') || errMsg.includes('S3') || errMsg.includes('R2') || presignRes.status === 501 || presignRes.status === 503) {
          message.warning('Хранилище не настроено. Используйте вкладку «URL» для вставки ссылки.');
          setActiveTab('url');
        } else {
          message.error(errMsg);
        }
        return false;
      }

      // 2. Upload directly to S3/R2
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', presignData.uploadUrl);
      xhr.setRequestHeader('Content-Type', file.type);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100));
        }
      };

      await new Promise<void>((resolve, reject) => {
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            onChange?.(presignData.publicUrl);
            setUrlInput(presignData.publicUrl);
            message.success('Видео загружено');
            resolve();
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(file);
      });
    } catch (err: any) {
      message.error(`Ошибка: ${err.message}`);
    } finally {
      setUploading(false);
      setProgress(0);
    }

    return false;
  };

  // URL input
  const handleUrlChange = (url: string) => {
    setUrlInput(url);
    onChange?.(url);
  };

  const items = [
    {
      key: 'upload',
      label: <><CloudUploadOutlined /> Загрузить</>,
      children: (
        <div>
          <Upload
            beforeUpload={presigned ? handlePresignedUpload : handleDirectUpload}
            showUploadList={false}
            accept={accept}
            maxCount={1}
          >
            <Button icon={<UploadOutlined />} loading={uploading} block>
              {uploading ? 'Загрузка...' : `Выбрать ${isImage ? 'изображение' : 'файл'}`}
            </Button>
          </Upload>
          {uploading && <Progress percent={progress} size="small" style={{ marginTop: 8 }} />}
          {value && isImage && (
            <div style={{ marginTop: 8 }}>
              <Image src={value} width={120} height={80} style={{ objectFit: 'cover', borderRadius: 4 }} />
            </div>
          )}
          {value && !isImage && (
            <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
              ✅ {value.split('/').pop()}
            </Text>
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
            placeholder={isImage ? 'https://example.com/poster.jpg' : 'https://youtube.com/watch?v=... или прямая ссылка'}
            value={urlInput}
            onChange={(e) => handleUrlChange(e.target.value)}
          />
          {urlInput && isImage && (
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
