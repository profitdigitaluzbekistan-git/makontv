import React, { useState } from 'react';
import { List, Edit, useTable, useForm } from '@refinedev/antd';
import { Table, Form, Input, Select, Switch, Tag, Space, Modal, Button, Typography } from 'antd';
import { EditButton } from '@refinedev/antd';
import { PlusOutlined } from '@ant-design/icons';
import { JsonbLangInput, JsonbLangDisplay } from '../../components/JsonbLangInput';
import { useCreate, useInvalidate } from '@refinedev/core';

const { Title } = Typography;

export const UserList: React.FC = () => {
  const { tableProps } = useTable({ resource: 'users' });
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const { mutate: createUser, isLoading } = useCreate();
  const invalidate = useInvalidate();

  const handleCreate = () => {
    form.validateFields().then((values) => {
      createUser(
        { resource: 'users', values },
        {
          onSuccess: () => {
            setModalOpen(false);
            form.resetFields();
            invalidate({ resource: 'users', invalidates: ['list'] });
          },
        },
      );
    });
  };

  return (
    <>
      <List
        headerButtons={() => (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            Добавить пользователя
          </Button>
        )}
      >
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

      <Modal
        title="Новый пользователь"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        onOk={handleCreate}
        confirmLoading={isLoading}
        okText="Создать"
        cancelText="Отмена"
        width={520}
      >
        <Form form={form} layout="vertical" initialValues={{ role: 'user', subscriptionStatus: 'guest', language: 'ru' }}>
          <Form.Item label="Email" name="email" rules={[{ required: true, type: 'email', message: 'Введите корректный email' }]}>
            <Input placeholder="user@example.com" />
          </Form.Item>
          <Form.Item label="Имя" name="name" rules={[{ required: true, message: 'Введите имя' }]}>
            <JsonbLangInput placeholder="Имя пользователя" />
          </Form.Item>
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
          <Form.Item label="Язык" name="language">
            <Select>
              <Select.Option value="ru">Русский</Select.Option>
              <Select.Option value="uz">O'zbek</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </>
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
