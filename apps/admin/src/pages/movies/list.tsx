import React from 'react';
import { List, useTable } from '@refinedev/antd';
import { Table, Tag, Space, Image } from 'antd';
import { EditButton, ShowButton, DeleteButton } from '@refinedev/antd';
import { JsonbLangDisplay } from '../../components/JsonbLangInput';

export const MovieList: React.FC = () => {
  const { tableProps } = useTable({
    resource: 'movies',
    sorters: { initial: [{ field: 'createdAt', order: 'desc' }] },
  });

  return (
    <List>
      <Table {...tableProps} rowKey="id" scroll={{ x: 1200 }}>
        <Table.Column
          title="Постер"
          dataIndex="posterUrl"
          width={80}
          render={(url) => url ? <Image src={url} width={50} height={70} style={{ objectFit: 'cover', borderRadius: 4 }} /> : '—'}
        />
        <Table.Column
          title="Название"
          dataIndex="title"
          render={(val) => <JsonbLangDisplay value={val} />}
        />
        <Table.Column title="Год" dataIndex="year" width={70} sorter />
        <Table.Column title="Рейтинг" dataIndex="rating" width={90} sorter />
        <Table.Column title="Качество" dataIndex="quality" width={80}
          render={(val) => <Tag color="blue">{val}</Tag>}
        />
        <Table.Column title="Возраст" dataIndex="ageRating" width={80} />
        <Table.Column
          title="Статус"
          dataIndex="isPublished"
          width={120}
          render={(val, record: any) => (
            <Space>
              {val ? <Tag color="green">Опубл.</Tag> : <Tag color="red">Черновик</Tag>}
              {record.isPremium && <Tag color="gold">Premium</Tag>}
              {record.featured && <Tag color="cyan">Hero</Tag>}
            </Space>
          )}
        />
        <Table.Column
          title="Действия"
          width={150}
          render={(_, record: any) => (
            <Space>
              <EditButton hideText size="small" recordItemId={record.id} />
              <DeleteButton hideText size="small" recordItemId={record.id} />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
