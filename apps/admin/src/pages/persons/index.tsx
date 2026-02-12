import React from 'react';
import { List, Create, Edit, useTable, useForm } from '@refinedev/antd';
import { Table, Form, Input, DatePicker, Space } from 'antd';
import { EditButton, DeleteButton } from '@refinedev/antd';
import { JsonbLangInput, JsonbLangDisplay } from '../../components/JsonbLangInput';

export const PersonList: React.FC = () => {
  const { tableProps } = useTable({ resource: 'persons' });
  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column title="Имя" dataIndex="name" render={(v) => <JsonbLangDisplay value={v} />} />
        <Table.Column title="Фото" dataIndex="photoUrl" width={60}
          render={(url) => url ? <img src={url} width={40} height={40} style={{ borderRadius: '50%', objectFit: 'cover' }} /> : '—'} />
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

const PersonForm: React.FC<{ isEdit?: boolean }> = ({ isEdit }) => {
  const { formProps, saveButtonProps } = useForm({ resource: 'persons' });
  const Wrapper = isEdit ? Edit : Create;
  return (
    <Wrapper saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item label="Имя" name="name" rules={[{ required: true }]}><JsonbLangInput /></Form.Item>
        <Form.Item label="Биография" name="bio"><JsonbLangInput textarea /></Form.Item>
        <Form.Item label="Место рождения" name="birthPlace"><JsonbLangInput /></Form.Item>
        <Form.Item label="Фото URL" name="photoUrl"><Input /></Form.Item>
      </Form>
    </Wrapper>
  );
};

export const PersonCreate: React.FC = () => <PersonForm />;
export const PersonEdit: React.FC = () => <PersonForm isEdit />;
