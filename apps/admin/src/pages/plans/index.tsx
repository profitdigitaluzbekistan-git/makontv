import React from 'react';
import { List, Create, Edit, useTable, useForm } from '@refinedev/antd';
import { Table, Form, Input, InputNumber, Switch, Tag, Space } from 'antd';
import { EditButton, DeleteButton } from '@refinedev/antd';
import { JsonbLangInput, JsonbLangDisplay } from '../../components/JsonbLangInput';

export const PlanList: React.FC = () => {
  const { tableProps } = useTable({ resource: 'plans' });
  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column title="Slug" dataIndex="slug" />
        <Table.Column title="Название" dataIndex="name" render={(v) => <JsonbLangDisplay value={v} />} />
        <Table.Column title="Цена" dataIndex="priceLabel" render={(v) => <JsonbLangDisplay value={v} />} />
        <Table.Column title="Устройства" dataIndex="maxDevices" width={100} />
        <Table.Column title="Реклама" dataIndex="hasAds" render={(v) => v ? <Tag color="red">Да</Tag> : <Tag color="green">Нет</Tag>} />
        <Table.Column title="Лучший" dataIndex="isBest" render={(v) => v ? <Tag color="gold">Да</Tag> : null} />
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

const PlanForm: React.FC<{ isEdit?: boolean }> = ({ isEdit }) => {
  const { formProps, saveButtonProps } = useForm({ resource: 'plans' });
  const Wrapper = isEdit ? Edit : Create;
  return (
    <Wrapper saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item label="Slug" name="slug" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item label="Название" name="name" rules={[{ required: true }]}><JsonbLangInput /></Form.Item>
        <Form.Item label="Цена (сум)" name="price"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item>
        <Form.Item label="Цена (отображение)" name="priceLabel"><JsonbLangInput /></Form.Item>
        <Form.Item label="Макс устройств" name="maxDevices"><InputNumber min={1} /></Form.Item>
        <Form.Item label="Макс профилей" name="maxProfiles"><InputNumber min={1} /></Form.Item>
        <Form.Item label="Качество" name="quality"><Input /></Form.Item>
        <Form.Item label="С рекламой" name="hasAds" valuePropName="checked"><Switch /></Form.Item>
        <Form.Item label="Скачивание" name="hasDownloads" valuePropName="checked"><Switch /></Form.Item>
        <Form.Item label="Лучший выбор" name="isBest" valuePropName="checked"><Switch /></Form.Item>
        <Form.Item label="Порядок" name="sortOrder"><InputNumber /></Form.Item>
      </Form>
    </Wrapper>
  );
};

export const PlanCreate: React.FC = () => <PlanForm />;
export const PlanEdit: React.FC = () => <PlanForm isEdit />;
