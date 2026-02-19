/**
 * Simple admin login gate.
 * Asks for ADMIN_SECRET, stores in localStorage.
 * Verifies stored secret on each page load.
 */
import React, { useState, useEffect } from 'react';
import { Card, Input, Button, Typography, Space, Alert, Spin } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { setAdminSecret, getAdminSecret } from '../providers/dataProvider';

const { Title, Text } = Typography;

export const LoginGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [secret, setSecret] = useState('');
  const [error, setError] = useState(false);
  const [verified, setVerified] = useState(false);
  const [checking, setChecking] = useState(true);

  // Verify stored secret on mount
  useEffect(() => {
    const stored = getAdminSecret();
    if (!stored) {
      setChecking(false);
      return;
    }
    const apiBase = import.meta.env.VITE_API_URL || '';
    fetch(`${apiBase}/admin/stats`, {
      headers: { 'X-Admin-Secret': stored },
    })
      .then((res) => {
        if (res.ok) {
          setVerified(true);
        } else {
          // Stored secret is invalid — clear it
          localStorage.removeItem('makontv_admin_secret');
        }
        setChecking(false);
      })
      .catch(() => {
        // Network error — allow through with stored secret (offline support)
        setVerified(true);
        setChecking(false);
      });
  }, []);

  if (checking) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        minHeight: '100vh', background: '#0a0a14',
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (verified) {
    return <>{children}</>;
  }

  const handleLogin = async () => {
    try {
      const apiBase = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${apiBase}/admin/stats`, {
        headers: { 'X-Admin-Secret': secret },
      });
      if (res.ok) {
        setAdminSecret(secret);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    }
  };

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      minHeight: '100vh', background: '#0a0a14',
    }}>
      <Card style={{ width: 400, background: '#1a1a2e', border: '1px solid #333' }}>
        <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
          <LockOutlined style={{ fontSize: 48, color: '#6bf1f6' }} />
          <Title level={3} style={{ color: '#fff', margin: 0 }}>MakonTV Admin</Title>
          <Text type="secondary">Введите ключ доступа</Text>
          {error && <Alert message="Неверный ключ" type="error" showIcon />}
          <Input.Password
            size="large"
            placeholder="Admin Secret"
            value={secret}
            onChange={(e) => { setSecret(e.target.value); setError(false); }}
            onPressEnter={handleLogin}
          />
          <Button type="primary" size="large" block onClick={handleLogin}
            style={{ background: '#6bf1f6', color: '#0a0a14', border: 'none' }}>
            Войти
          </Button>
        </Space>
      </Card>
    </div>
  );
};
