import React, { useState } from 'react';
import { Tabs, Typography } from 'antd';
import { CrownOutlined, AppstoreOutlined } from '@ant-design/icons';
import { PlanList, PlanCreate, PlanEdit } from '../plans';
import { CollectionList, CollectionCreate, CollectionEdit } from '../collections';

const { Title } = Typography;

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('plans');

  return (
    <div>
      <Title level={3}>Настройки</Title>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'plans',
            label: <><CrownOutlined /> Тарифы</>,
            children: <PlanList />,
          },
          {
            key: 'collections',
            label: <><AppstoreOutlined /> Подборки</>,
            children: <CollectionList />,
          },
        ]}
      />
    </div>
  );
};
