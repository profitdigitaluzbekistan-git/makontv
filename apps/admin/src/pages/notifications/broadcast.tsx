/**
 * Broadcast Notification page — send notification to all users.
 */
import React, { useState } from 'react';
import { Card, Form, Select, Input, Button, Typography, Alert, Space } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { JsonbLangInput } from '../../components/JsonbLangInput';
import { getAdminSecret } from '../../providers/dataProvider';

const { Title } = Typography;

export const BroadcastPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [form] = Form.useForm();

  const handleSend = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      setResult(null);

      const apiUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiUrl}/api/users/broadcast/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Secret': getAdminSecret(),
        },
        body: JSON.stringify(values),
      });

      const data = await res.json();
      if (res.ok) {
        setResult(`Уведомление отправлено ${data.sentTo} пользователям`);
        form.resetFields();
      } else {
        setResult(`Ошибка: ${data.error}`);
      }
    } catch (err: any) {
      setResult(`Ошибка: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Title level={3}>Массовая рассылка уведомлений</Title>
      <Card style={{ maxWidth: 600 }}>
        <Form form={form} layout="vertical">
          <Form.Item label="Тип" name="type" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="new_movie">Новый фильм</Select.Option>
              <Select.Option value="new_episode">Новая серия</Select.Option>
              <Select.Option value="promo">Промо-акция</Select.Option>
              <Select.Option value="system">Системное</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="Заголовок" name="title" rules={[{ required: true }]}>
            <JsonbLangInput />
          </Form.Item>
          <Form.Item label="Текст" name="body">
            <JsonbLangInput />
          </Form.Item>
          <Form.Item label="Иконка" name="iconType">
            <Select allowClear>
              <Select.Option value="play">▶ Play</Select.Option>
              <Select.Option value="gift">🎁 Gift</Select.Option>
              <Select.Option value="system">⚙ System</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="Ссылка" name="actionUrl">
            <Input placeholder="#plans" />
          </Form.Item>

          {result && (
            <Alert message={result} type={result.startsWith('Ошибка') ? 'error' : 'success'}
              style={{ marginBottom: 16 }} showIcon />
          )}

          <Button type="primary" icon={<SendOutlined />} loading={loading} onClick={handleSend}
            style={{ background: '#6bf1f6', color: '#0a0a14', border: 'none' }}>
            Отправить всем пользователям
          </Button>
        </Form>
      </Card>
    </div>
  );
};
