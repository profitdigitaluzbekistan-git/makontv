import React from 'react';
import { List, Create, Edit, useTable, useForm } from '@refinedev/antd';
import { Table, Form, Input, InputNumber, Switch, Select, Space, Tag } from 'antd';
import { EditButton, DeleteButton } from '@refinedev/antd';
import { JsonbLangInput, JsonbLangDisplay } from '../../components/JsonbLangInput';

// ═══ SEASONS ═══
export const SeasonList: React.FC = () => {
  const { tableProps } = useTable({ resource: 'seasons' });
  return (
    <List resource="seasons">
      <Table {...tableProps} rowKey="id">
        <Table.Column title="Сериал ID" dataIndex="seriesId" ellipsis width={200} />
        <Table.Column title="Номер" dataIndex="number" width={80} sorter />
        <Table.Column title="Название" dataIndex="title" render={(v) => <JsonbLangDisplay value={v} />} />
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

const SeasonForm: React.FC<{ isEdit?: boolean }> = ({ isEdit }) => {
  const { formProps, saveButtonProps } = useForm({ resource: 'seasons' });
  const Wrapper = isEdit ? Edit : Create;
  return (
    <Wrapper saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item label="Сериал ID" name="seriesId" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item label="Номер сезона" name="number" rules={[{ required: true }]}><InputNumber min={1} /></Form.Item>
        <Form.Item label="Название" name="title"><JsonbLangInput /></Form.Item>
        <Form.Item label="Описание" name="description"><JsonbLangInput textarea /></Form.Item>
        <Form.Item label="Постер URL" name="posterUrl"><Input /></Form.Item>
      </Form>
    </Wrapper>
  );
};

export const SeasonCreate: React.FC = () => <SeasonForm />;
export const SeasonEdit: React.FC = () => <SeasonForm isEdit />;

// ═══ EPISODES ═══
export const EpisodeList: React.FC = () => {
  const { tableProps } = useTable({ resource: 'episodes' });
  return (
    <List resource="episodes">
      <Table {...tableProps} rowKey="id" scroll={{ x: 900 }}>
        <Table.Column title="Сезон ID" dataIndex="seasonId" ellipsis width={200} />
        <Table.Column title="№" dataIndex="number" width={50} sorter />
        <Table.Column title="Название" dataIndex="title" render={(v) => <JsonbLangDisplay value={v} />} />
        <Table.Column title="Мин" dataIndex="durationMin" width={60} />
        <Table.Column title="Бесплатно" dataIndex="isFree" width={100}
          render={(v) => v ? <Tag color="green">Да</Tag> : <Tag>Нет</Tag>} />
        <Table.Column title="Видео" dataIndex="videoUrl" ellipsis width={200} />
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

const EpisodeForm: React.FC<{ isEdit?: boolean }> = ({ isEdit }) => {
  const { formProps, saveButtonProps } = useForm({ resource: 'episodes' });
  const Wrapper = isEdit ? Edit : Create;
  return (
    <Wrapper saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item label="Сезон ID" name="seasonId" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item label="Номер серии" name="number" rules={[{ required: true }]}><InputNumber min={1} /></Form.Item>
        <Form.Item label="Название" name="title" rules={[{ required: true }]}><JsonbLangInput /></Form.Item>
        <Form.Item label="Описание" name="description"><JsonbLangInput textarea /></Form.Item>
        <Form.Item label="Длительность (мин)" name="durationMin"><InputNumber min={1} /></Form.Item>
        <Form.Item label="Превью URL" name="thumbnailUrl"><Input /></Form.Item>
        <Form.Item label="Видео URL" name="videoUrl"><Input /></Form.Item>
        <Form.Item label="Тип видео" name="videoType" initialValue="url">
          <Select>
            <Select.Option value="url">URL</Select.Option>
            <Select.Option value="youtube">YouTube</Select.Option>
            <Select.Option value="hls">HLS</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label="Бесплатный эпизод" name="isFree" valuePropName="checked"><Switch /></Form.Item>
      </Form>
    </Wrapper>
  );
};

export const EpisodeCreate: React.FC = () => <EpisodeForm />;
export const EpisodeEdit: React.FC = () => <EpisodeForm isEdit />;
