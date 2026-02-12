import React from 'react';
import { List, Create, Edit, useTable, useForm } from '@refinedev/antd';
import { Table, Form, Input, InputNumber, Select, Switch, Tag, Space, Divider, Row, Col } from 'antd';
import { EditButton, DeleteButton } from '@refinedev/antd';
import { JsonbLangInput, JsonbLangDisplay } from '../../components/JsonbLangInput';

export const SeriesList: React.FC = () => {
  const { tableProps } = useTable({ resource: 'series', sorters: { initial: [{ field: 'createdAt', order: 'desc' }] } });
  return (
    <List>
      <Table {...tableProps} rowKey="id" scroll={{ x: 1000 }}>
        <Table.Column title="Название" dataIndex="title" render={(v) => <JsonbLangDisplay value={v} />} />
        <Table.Column title="Год" dataIndex="year" width={70} sorter />
        <Table.Column title="Рейтинг" dataIndex="rating" width={90} />
        <Table.Column title="Качество" dataIndex="quality" width={80} render={(v) => <Tag color="blue">{v}</Tag>} />
        <Table.Column title="Статус" dataIndex="isPublished" width={120}
          render={(val, rec: any) => (
            <Space>
              {val ? <Tag color="green">Опубл.</Tag> : <Tag color="red">Черновик</Tag>}
              {rec.isPremium && <Tag color="gold">Premium</Tag>}
            </Space>
          )}
        />
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

const SeriesForm: React.FC<{ isEdit?: boolean }> = ({ isEdit }) => {
  const { formProps, saveButtonProps } = useForm({ resource: 'series' });
  const Wrapper = isEdit ? Edit : Create;
  return (
    <Wrapper saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Slug" name="slug" rules={[{ required: true }]}><Input /></Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Год" name="year"><InputNumber style={{ width: '100%' }} /></Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Качество" name="quality">
              <Select><Select.Option value="HD">HD</Select.Option><Select.Option value="4K">4K</Select.Option></Select>
            </Form.Item>
          </Col>
        </Row>
        <Form.Item label="Название" name="title" rules={[{ required: true }]}><JsonbLangInput /></Form.Item>
        <Form.Item label="Описание" name="description"><JsonbLangInput textarea /></Form.Item>
        <Row gutter={16}>
          <Col span={8}><Form.Item label="Рейтинг" name="rating"><InputNumber style={{ width: '100%' }} min={0} max={10} step={0.1} /></Form.Item></Col>
          <Col span={8}><Form.Item label="Возраст" name="ageRating">
            <Select allowClear><Select.Option value="0+">0+</Select.Option><Select.Option value="12+">12+</Select.Option><Select.Option value="16+">16+</Select.Option><Select.Option value="18+">18+</Select.Option></Select>
          </Form.Item></Col>
        </Row>
        <Form.Item label="Постер URL" name="posterUrl"><Input /></Form.Item>
        <Form.Item label="Фон URL" name="backdropUrl"><Input /></Form.Item>
        <Form.Item label="Трейлер URL" name="trailerUrl"><Input /></Form.Item>
        <Divider />
        <Row gutter={16}>
          <Col span={6}><Form.Item label="Опубликован" name="isPublished" valuePropName="checked"><Switch /></Form.Item></Col>
          <Col span={6}><Form.Item label="Premium" name="isPremium" valuePropName="checked"><Switch /></Form.Item></Col>
          <Col span={6}><Form.Item label="Hero" name="featured" valuePropName="checked"><Switch /></Form.Item></Col>
          <Col span={6}><Form.Item label="Порядок" name="sortOrder"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
        </Row>
      </Form>
    </Wrapper>
  );
};

export const SeriesCreate: React.FC = () => <SeriesForm />;
export const SeriesEdit: React.FC = () => <SeriesForm isEdit />;
