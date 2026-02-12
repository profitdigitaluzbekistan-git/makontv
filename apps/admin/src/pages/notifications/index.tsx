import React from 'react';
import { List, Create, useTable, useForm } from '@refinedev/antd';
import { Table, Form, Input, Select, Tag, Space } from 'antd';
import { DeleteButton } from '@refinedev/antd';
import { JsonbLangInput, JsonbLangDisplay } from '../../components/JsonbLangInput';

export const NotificationList: React.FC = () => {
  const { tableProps } = useTable({ resource: 'notifications' });
  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column title="Тип" dataIndex="type" render={(v) => <Tag>{v}</Tag>} />
        <Table.Column title="Заголовок" dataIndex="title" render={(v) => <JsonbLangDisplay value={v} />} />
        <Table.Column title="Текст" dataIndex="body" render={(v) => <JsonbLangDisplay value={v} />} />
        <Table.Column title="Прочитано" dataIndex="isRead" render={(v) => v ? <Tag color="green">Да</Tag> : <Tag>Нет</Tag>} />
        <Table.Column title="" width={80} render={(_, r: any) => <DeleteButton hideText size="small" recordItemId={r.id} />} />
      </Table>
    </List>
  );
};

export const NotificationCreate: React.FC = () => {
  const { formProps, saveButtonProps } = useForm({ resource: 'notifications' });
  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item label="User ID (или пусто для broadcast)" name="userId"><Input /></Form.Item>
        <Form.Item label="Тип" name="type" rules={[{ required: true }]}>
          <Select>
            <Select.Option value="new_episode">Новая серия</Select.Option>
            <Select.Option value="new_movie">Новый фильм</Select.Option>
            <Select.Option value="promo">Промо</Select.Option>
            <Select.Option value="system">Системное</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="Заголовок" name="title" rules={[{ required: true }]}><JsonbLangInput /></Form.Item>
        <Form.Item label="Текст" name="body"><JsonbLangInput /></Form.Item>
        <Form.Item label="Иконка" name="iconType">
          <Select allowClear>
            <Select.Option value="play">▶ Play</Select.Option>
            <Select.Option value="gift">🎁 Gift</Select.Option>
            <Select.Option value="system">⚙ System</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="Ссылка (hash route)" name="actionUrl">
          <Input placeholder="#series-detail" />
        </Form.Item>
      </Form>
    </Create>
  );
};
