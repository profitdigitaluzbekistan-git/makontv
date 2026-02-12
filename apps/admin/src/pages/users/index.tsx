import React from 'react';
import { List, Edit, useTable, useForm } from '@refinedev/antd';
import { Table, Form, Input, Select, Switch, Tag, Space, Divider } from 'antd';
import { EditButton } from '@refinedev/antd';
import { JsonbLangDisplay } from '../../components/JsonbLangInput';

export const UserList: React.FC = () => {
  const { tableProps } = useTable({ resource: 'users' });
  return (
    <List canCreate={false}>
      <Table {...tableProps} rowKey="id">
        <Table.Column title="Email" dataIndex="email" />
        <Table.Column title="Имя" dataIndex="name" render={(v) => <JsonbLangDisplay value={v} />} />
        <Table.Column title="Роль" dataIndex="role" render={(v) => {
          const colors: any = { admin: 'red', editor: 'orange', support: 'blue', user: 'default' };
          return <Tag color={colors[v] || 'default'}>{v}</Tag>;
        }} />
        <Table.Column title="Подписка" dataIndex="subscriptionStatus" render={(v) => {
          const colors: any = { active: 'green', trial: 'cyan', expired: 'red', guest: 'default' };
          return <Tag color={colors[v] || 'default'}>{v}</Tag>;
        }} />
        <Table.Column title="Заблокирован" dataIndex="isBlocked" render={(v) => v ? <Tag color="red">Да</Tag> : null} />
        <Table.Column title="" width={80} render={(_, r: any) => <EditButton hideText size="small" recordItemId={r.id} />} />
      </Table>
    </List>
  );
};

export const UserEdit: React.FC = () => {
  const { formProps, saveButtonProps } = useForm({ resource: 'users' });
  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item label="Email" name="email"><Input disabled /></Form.Item>
        <Form.Item label="Роль" name="role">
          <Select>
            <Select.Option value="user">User</Select.Option>
            <Select.Option value="editor">Editor</Select.Option>
            <Select.Option value="support">Support</Select.Option>
            <Select.Option value="admin">Admin</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="Статус подписки" name="subscriptionStatus">
          <Select>
            <Select.Option value="guest">Guest</Select.Option>
            <Select.Option value="trial">Trial</Select.Option>
            <Select.Option value="active">Active</Select.Option>
            <Select.Option value="expired">Expired</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="Заблокирован" name="isBlocked" valuePropName="checked"><Switch /></Form.Item>
        <Form.Item label="Язык" name="language">
          <Select>
            <Select.Option value="ru">Русский</Select.Option>
            <Select.Option value="uz">O'zbek</Select.Option>
          </Select>
        </Form.Item>
      </Form>
    </Edit>
  );
};
