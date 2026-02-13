import React, { useState } from 'react';
import { Tabs, Typography } from 'antd';
import { PlayCircleOutlined, VideoCameraOutlined } from '@ant-design/icons';
import { MovieList } from '../movies/list';
import { SeriesList } from '../series';

const { Title } = Typography;

export const ContentPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('movies');

  return (
    <div>
      <Title level={3}>Контент</Title>
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
