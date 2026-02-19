/**
 * Analytics Dashboard — visual stats for admin panel
 */
import React, { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Typography, Table, Tag, Select, Space, Divider } from 'antd';
import {
  UserOutlined, PlayCircleOutlined, EyeOutlined,
  ClockCircleOutlined, DollarOutlined, RiseOutlined,
  HeartOutlined, StarOutlined,
} from '@ant-design/icons';
import { getAdminSecret } from '../../providers/dataProvider';

const { Title, Text } = Typography;

const API_URL = import.meta.env.VITE_API_URL || '';

async function fetchAnalytics(endpoint: string) {
  const res = await fetch(`${API_URL}/admin/analytics/${endpoint}`, {
    headers: { 'X-Admin-Secret': getAdminSecret() },
  });
  return res.json();
}

export const AnalyticsPage: React.FC = () => {
  const [overview, setOverview] = useState<any>(null);
  const [content, setContent] = useState<any>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [revenue, setRevenue] = useState<any>(null);
  const [period, setPeriod] = useState('7d');

  useEffect(() => {
    fetchAnalytics('overview').then(setOverview);
    fetchAnalytics(`content?period=${period}`).then(setContent);
    fetchAnalytics('users').then(setUserStats);
    fetchAnalytics('revenue').then(setRevenue);
  }, [period]);

  if (!overview) return <div>Загрузка...</div>;

  const t = overview.totals || {};
  const a = overview.activity || {};

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Аналитика</Title>
        <Select value={period} onChange={setPeriod} style={{ width: 160 }}>
          <Select.Option value="24h">За 24 часа</Select.Option>
          <Select.Option value="7d">За 7 дней</Select.Option>
          <Select.Option value="30d">За 30 дней</Select.Option>
        </Select>
      </Space>

      {/* KPIs */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={8} md={6}>
          <Card><Statistic title="Пользователи" value={t.users} prefix={<UserOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card><Statistic title="Подписчики" value={t.subscribers} prefix={<RiseOutlined />}
            valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card><Statistic title="Активных (неделя)" value={a.activeUsersWeek} prefix={<EyeOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card><Statistic title="Новых (неделя)" value={a.newUsersWeek} prefix={<UserOutlined />}
            valueStyle={{ color: '#1890ff' }} /></Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card><Statistic title="Просмотров сегодня" value={a.viewsToday} prefix={<PlayCircleOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card><Statistic title="Часов просмотра" value={a.totalWatchHours} prefix={<ClockCircleOutlined />}
            suffix="ч" /></Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card><Statistic title="Фильмов" value={t.movies} prefix={<PlayCircleOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card>
            {revenue && (
              <Statistic title="Доход/мес" value={revenue.monthlyRevenue}
                prefix={<DollarOutlined />} suffix="сум"
                valueStyle={{ color: '#52c41a' }} />
            )}
          </Card>
        </Col>
      </Row>

      <Divider />

      {/* Popular Content */}
      <Row gutter={16}>
        <Col span={14}>
          <Card title="Популярный контент">
            <Table
              dataSource={content?.topWatched || []}
              rowKey="slug"
              pagination={false}
              size="small"
              columns={[
                { title: 'Фильм', dataIndex: 'title', render: (v: any) => v?.ru || v },
                { title: 'Просмотры', dataIndex: 'views', width: 100 },
                { title: 'Зрители', dataIndex: 'uniqueViewers', width: 100 },
                { title: 'Дошло до конца', dataIndex: 'avgCompletion', width: 130,
                  render: (v: number) => <Tag color={v > 70 ? 'green' : v > 40 ? 'orange' : 'red'}>{v}%</Tag> },
                { title: 'Рейтинг', dataIndex: 'rating', width: 80 },
              ]}
            />
          </Card>
        </Col>
        <Col span={10}>
          <Card title="По подпискам" style={{ marginBottom: 16 }}>
            {userStats?.byStatus?.map((s: any) => (
              <div key={s.status} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <Tag color={s.status === 'active' ? 'green' : s.status === 'trial' ? 'cyan' : 'default'}>
                  {s.status}
                </Tag>
                <Text strong>{s.count}</Text>
              </div>
            ))}
          </Card>
          <Card title="По языку">
            {userStats?.byLanguage?.map((l: any) => (
              <div key={l.lang} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <Text>{l.lang === 'ru' ? '🇷🇺 Русский' : '🇺🇿 Oʻzbek'}</Text>
                <Text strong>{l.count}</Text>
              </div>
            ))}
          </Card>
        </Col>
      </Row>

      {/* Revenue */}
      {revenue && revenue.breakdown && revenue.breakdown.length > 0 && (
        <>
          <Divider />
          <Card title="Доходы от подписок">
            <Table
              dataSource={revenue.breakdown}
              rowKey={(r: any) => r.plan?.ru || r.plan}
              pagination={false}
              size="small"
              columns={[
                { title: 'Тариф', dataIndex: 'plan', render: (v: any) => v?.ru || v },
                { title: 'Цена', dataIndex: 'price', render: (v: number) => `${v?.toLocaleString()} сум` },
                { title: 'Подписчиков', dataIndex: 'subscribers' },
                { title: 'Месяц', dataIndex: 'monthlyTotal',
                  render: (v: number) => <Text strong style={{ color: '#52c41a' }}>{v?.toLocaleString()} сум</Text> },
              ]}
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={3}><Text strong>Итого</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={3}>
                    <Text strong style={{ color: '#52c41a' }}>{revenue.monthlyRevenue?.toLocaleString()} сум/мес</Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
          </Card>
        </>
      )}
    </div>
  );
};
