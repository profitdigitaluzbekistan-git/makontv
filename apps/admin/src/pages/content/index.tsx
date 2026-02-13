import React, { useState } from 'react';
import { Tabs, Typography, Button, Space } from 'antd';
import { PlayCircleOutlined, VideoCameraOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { MovieList } from '../movies/list';
import { SeriesList } from '../series';

const { Title } = Typography;

export const ContentPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('movies');
  const navigate = useNavigate();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Контент</Title>
        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          onClick={() => navigate(activeTab === 'movies' ? '/movies/create' : '/series/create')}
        >
          {activeTab === 'movies' ? 'Добавить фильм' : 'Добавить сериал'}
        </Button>
      </div>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'movies',
            label: <><PlayCircleOutlined /> Фильмы</>,
            children: <MovieList />,
          },
          {
            key: 'series',
            label: <><VideoCameraOutlined /> Сериалы</>,
            children: <SeriesList />,
          },
        ]}
      />
    </div>
  );
};
