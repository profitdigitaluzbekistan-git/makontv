import React from 'react';
import { List, Create, Edit, useTable, useForm } from '@refinedev/antd';
import { Table, Form, Input, InputNumber, Space } from 'antd';
import { EditButton, DeleteButton } from '@refinedev/antd';
import { JsonbLangInput, JsonbLangDisplay } from '../../components/JsonbLangInput';

export const GenreList: React.FC = () => {
  const { tableProps } = useTable({
    resource: 'genres',
    sorters: { initial: [{ field: 'sortOrder', order: 'asc' }] },
    filters: { initial: [] },
  });
  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column title="Slug" dataIndex="slug" />
        <Table.Column title="Название" dataIndex="name" render={(v) => <JsonbLangDisplay value={v} />} />
        <Table.Column title="Иконка" dataIndex="icon" />
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

const GenreForm: React.FC<{ isEdit?: boolean }> = ({ isEdit }) => {
  const { formProps, saveButtonProps } = useForm({ resource: 'genres' });
  const Wrapper = isEdit ? Edit : Create;
  return (
    <Wrapper saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item label="Slug" name="slug" rules={[{ required: true }]}>
          <Input placeholder="thriller" />
        </Form.Item>
        <Form.Item label="Название" name="name" rules={[{ required: true }]}>
          <JsonbLangInput placeholder="Триллер" />
        </Form.Item>
        <Form.Item label="Иконка (emoji/class)" name="icon">
          <Input placeholder="🔥" />
        </Form.Item>
        <Form.Item label="Порядок" name="sortOrder">
          <InputNumber />
        </Form.Item>
      </Form>
    </Wrapper>
  );
};

export const GenreCreate: React.FC = () => <GenreForm />;
export const GenreEdit: React.FC = () => <GenreForm isEdit />;
