import React, { useState } from 'react';
import { List, useTable } from '@refinedev/antd';
import { Table, Tag, Space, Image, Tabs, Input, Typography } from 'antd';
import { EditButton, DeleteButton } from '@refinedev/antd';
import { JsonbLangDisplay } from '../../components/JsonbLangInput';
import { SearchOutlined } from '@ant-design/icons';

const { Text } = Typography;

export const MovieList: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('all');

  const { tableProps, setFilters } = useTable({
    resource: 'movies',
    sorters: { initial: [{ field: 'createdAt', order: 'desc' }] },
    filters: {
      initial: activeTab === 'published'
        ? [{ field: 'isPublished', operator: 'eq', value: true }]
        : activeTab === 'drafts'
        ? [{ field: 'isPublished', operator: 'eq', value: false }]
        : [],
    },
  });

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    if (key === 'published') {
      setFilters([{ field: 'isPublished', operator: 'eq', value: true }]);
    } else if (key === 'drafts') {
      setFilters([{ field: 'isPublished', operator: 'eq', value: false }]);
    } else {
      setFilters([]);
    }
  };

  const handleSearch = (value: string) => {
    const filters: any[] = [];
    if (value) filters.push({ field: 'q', operator: 'eq', value });
    if (activeTab === 'published') filters.push({ field: 'isPublished', operator: 'eq', value: true });
    else if (activeTab === 'drafts') filters.push({ field: 'isPublished', operator: 'eq', value: false });
    setFilters(filters);
  };

  return (
    <List resource="movies">
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={[
            { key: 'all', label: 'Все' },
            { key: 'published', label: 'Опубликованные' },
            { key: 'drafts', label: 'Черновики' },
          ]}
          style={{ marginBottom: 0 }}
        />
        <Input.Search
          placeholder="Поиск по названию..."
          onSearch={handleSearch}
          allowClear
          style={{ width: 300 }}
          prefix={<SearchOutlined />}
        />
      </div>

      <Table {...tableProps} rowKey="id" scroll={{ x: 1200 }}>
        <Table.Column
          title="Постер"
          dataIndex="posterUrl"
          width={80}
          render={(url) => url ? <Image src={url} width={50} height={70} style={{ objectFit: 'cover', borderRadius: 4 }} /> : <div style={{ width: 50, height: 70, background: '#1a1a2e', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Text type="secondary" style={{ fontSize: 10 }}>---</Text></div>}
        />
        <Table.Column
          title="Название"
          dataIndex="title"
          render={(val) => <JsonbLangDisplay value={val} />}
        />
        <Table.Column title="Год" dataIndex="year" width={70} sorter />
        <Table.Column title="Качество" dataIndex="quality" width={80}
          render={(val) => val ? <Tag color="blue">{val}</Tag> : null}
        />
        <Table.Column title="Возраст" dataIndex="ageRating" width={80} />
        <Table.Column
          title="Статус"
          dataIndex="isPublished"
          width={180}
          render={(val, record: any) => (
            <Space>
              {val
                ? <Tag color="green">Опубликовано</Tag>
                : <Tag color="default">Черновик</Tag>}
              {record.isPremium && <Tag color="gold">Premium</Tag>}
              {record.featured && <Tag color="cyan">Hero</Tag>}
            </Space>
          )}
        />
        <Table.Column
          title="Действия"
          width={120}
          render={(_, record: any) => (
            <Space>
              <EditButton hideText size="small" recordItemId={record.id} resource="movies" />
              <DeleteButton hideText size="small" recordItemId={record.id} resource="movies" />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
