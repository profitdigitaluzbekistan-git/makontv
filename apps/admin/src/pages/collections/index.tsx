import React from 'react';
import { List, Create, Edit, useTable, useForm } from '@refinedev/antd';
import { Table, Form, Input, InputNumber, Select, Switch, Tag, Space } from 'antd';
import { EditButton, DeleteButton } from '@refinedev/antd';
import { JsonbLangInput, JsonbLangDisplay } from '../../components/JsonbLangInput';

export const CollectionList: React.FC = () => {
  const { tableProps } = useTable({ resource: 'collections' });
  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column title="Slug" dataIndex="slug" />
        <Table.Column title="Название" dataIndex="title" render={(v) => <JsonbLangDisplay value={v} />} />
        <Table.Column title="Тип" dataIndex="type" render={(v) => <Tag>{v}</Tag>} />
        <Table.Column title="Страница" dataIndex="page" />
        <Table.Column title="Активна" dataIndex="isActive" render={(v) => v ? <Tag color="green">Да</Tag> : <Tag>Нет</Tag>} />
        <Table.Column title="Порядок" dataIndex="sortOrder" width={80} sorter />
        <Table.Column title="" width={120} render={(_, r: any) => (
          <Space>
            <EditButton hideText size="small" recordItemId={r.id} />
            <DeleteButton hideText size="small" recordItemId={r.id} />
          </Space>
        )} />
      </Table>
    </List>
  );
};

const CollectionForm: React.FC<{ isEdit?: boolean }> = ({ isEdit }) => {
  const { formProps, saveButtonProps } = useForm({ resource: 'collections' });
  const Wrapper = isEdit ? Edit : Create;
  return (
    <Wrapper saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item label="Slug" name="slug" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item label="Название" name="title" rules={[{ required: true }]}><JsonbLangInput /></Form.Item>
        <Form.Item label="Тип" name="type" initialValue="manual">
          <Select>
            <Select.Option value="manual">Ручная подборка</Select.Option>
            <Select.Option value="auto_new">Авто: новинки</Select.Option>
            <Select.Option value="auto_top">Авто: топ по рейтингу</Select.Option>
            <Select.Option value="auto_genre">Авто: по жанру</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="Страница" name="page" initialValue="home">
          <Select>
            <Select.Option value="home">Главная</Select.Option>
            <Select.Option value="catalog">Каталог</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="Активна" name="isActive" valuePropName="checked" initialValue={true}><Switch /></Form.Item>
        <Form.Item label="Порядок" name="sortOrder"><InputNumber /></Form.Item>
      </Form>
    </Wrapper>
  );
};

export const CollectionCreate: React.FC = () => <CollectionForm />;
export const CollectionEdit: React.FC = () => <CollectionForm isEdit />;
