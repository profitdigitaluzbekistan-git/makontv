import React, { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Typography, List } from 'antd';
import {
  PlayCircleOutlined, VideoCameraOutlined, UserOutlined,
  TagOutlined, TeamOutlined, AppstoreOutlined,
} from '@ant-design/icons';
import { getAdminSecret } from '../../providers/dataProvider';

const { Title } = Typography;

interface Stats {
  counts: Record<string, number>;
  recentMovies: any[];
  recentUsers: any[];
}

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch('/admin/stats', {
      headers: { 'X-Admin-Secret': getAdminSecret() },
    })
      .then(r => r.json())
      .then(setStats)
      .catch(console.error);
  }, []);

  if (!stats) return <div>Загрузка...</div>;

  const c = stats.counts;
  return (
    <div>
      <Title level={3}>Панель управления</Title>
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={8} md={6}>
          <Card><Statistic title="Фильмы" value={c.movies} prefix={<PlayCircleOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card><Statistic title="Сериалы" value={c.series} prefix={<VideoCameraOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card><Statistic title="Эпизоды" value={c.episodes} prefix={<PlayCircleOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card><Statistic title="Пользователи" value={c.users} prefix={<UserOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card><Statistic title="Жанры" value={c.genres} prefix={<TagOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card><Statistic title="Персоны" value={c.persons} prefix={<TeamOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card><Statistic title="Подборки" value={c.collections} prefix={<AppstoreOutlined />} /></Card>
        </Col>
        <Col xs={12} sm={8} md={6}>
          <Card><Statistic title="Отзывы" value={c.reviews} /></Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 24 }}>
        <Col span={12}>
          <Card title="Последние фильмы">
            <List
              dataSource={stats.recentMovies}
              renderItem={(m: any) => (
                <List.Item>
                  <List.Item.Meta
                    title={m.title?.ru || m.slug}
                    description={`${m.year || '—'} · ${m.quality || 'HD'} · Рейтинг: ${m.rating || '—'}`}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Последние пользователи">
            <List
              dataSource={stats.recentUsers}
              renderItem={(u: any) => (
                <List.Item>
                  <List.Item.Meta
                    title={u.email || u.name?.ru || 'Без имени'}
                    description={`Роль: ${u.role} · Статус: ${u.subscriptionStatus}`}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};
