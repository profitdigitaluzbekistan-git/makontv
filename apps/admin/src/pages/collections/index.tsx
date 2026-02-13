import React, { useState, useEffect } from 'react';
import { List, Create, Edit, useTable, useForm } from '@refinedev/antd';
import { Table, Form, Input, InputNumber, Select, Switch, Tag, Space, Card, Button, Typography, Modal, Divider, Empty } from 'antd';
import { EditButton, DeleteButton } from '@refinedev/antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { JsonbLangInput, JsonbLangDisplay } from '../../components/JsonbLangInput';
import { getAdminSecret } from '../../providers/dataProvider';

const { Text, Title } = Typography;
const API_BASE = (import.meta.env.VITE_API_URL || '') + '/admin';
const fetchAuth = (url: string, init?: RequestInit) =>
  fetch(url, { ...init, headers: { 'X-Admin-Secret': getAdminSecret(), 'Content-Type': 'application/json' } });

export const CollectionList: React.FC = () => {
  const { tableProps } = useTable({ resource: 'collections', sorters: { initial: [{ field: 'sortOrder', order: 'asc' }] } });
  return (
    <List createButtonProps={{ children: 'Создать блок' }}>
      <Table {...tableProps} rowKey="id">
        <Table.Column title="Порядок" dataIndex="sortOrder" width={80} sorter />
        <Table.Column title="Slug" dataIndex="slug" width={150} />
        <Table.Column title="Название" dataIndex="title" render={(v) => <JsonbLangDisplay value={v} />} />
        <Table.Column title="Тип" dataIndex="type" width={120} render={(v) => <Tag>{v === 'manual' ? 'Ручная' : v}</Tag>} />
        <Table.Column title="Активна" dataIndex="isActive" width={80} render={(v) => v ? <Tag color="green">Да</Tag> : <Tag>Нет</Tag>} />
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

// ═══ Collection Items Manager ═══
const CollectionItems: React.FC<{ collectionId: string }> = ({ collectionId }) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [contentType, setContentType] = useState<'movie' | 'series'>('movie');
  const [contentOptions, setContentOptions] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await fetchAuth(`${API_BASE}/collection-items/${collectionId}`);
      const data = await res.json();
      // Enrich items with movie/series data
      const enriched = await Promise.all(data.map(async (item: any) => {
        try {
          if (item.movieId) {
            const r = await fetchAuth(`${API_BASE}/movies/${item.movieId}`);
            const movie = await r.json();
            return { ...item, content: movie, type: 'movie' };
          } else if (item.seriesId) {
            const r = await fetchAuth(`${API_BASE}/series/${item.seriesId}`);
            const s = await r.json();
            return { ...item, content: s, type: 'series' };
          }
        } catch {}
        return { ...item, content: null, type: 'unknown' };
      }));
      setItems(enriched);
    } catch { setItems([]); }
    setLoading(false);
  };

  useEffect(() => { if (collectionId) loadItems(); }, [collectionId]);

  const loadContentOptions = async (type: 'movie' | 'series') => {
    const endpoint = type === 'movie' ? 'movies' : 'series';
    try {
      const res = await fetchAuth(`${API_BASE}/${endpoint}?_limit=200`);
      const data = await res.json();
      setContentOptions(data.map((c: any) => ({
        value: c.id,
        label: (c.title?.ru || c.title?.uz || c.slug || '—') + (c.year ? ` (${c.year})` : ''),
        poster: c.posterUrl,
      })));
    } catch { setContentOptions([]); }
  };

  const handleAdd = async () => {
    if (!selectedId) return;
    const body: any = { collectionId, sortOrder: items.length + 1 };
    if (contentType === 'movie') body.movieId = selectedId;
    else body.seriesId = selectedId;
    await fetchAuth(`${API_BASE}/collection-items`, { method: 'POST', body: JSON.stringify(body) });
    setAddOpen(false);
    setSelectedId(null);
    loadItems();
  };

  const handleRemove = async (itemId: string) => {
    await fetchAuth(`${API_BASE}/collection-items/${itemId}`, { method: 'DELETE' });
    loadItems();
  };

  const getTitle = (item: any) => {
    if (!item.content) return '(удалён)';
    const t = item.content.title;
    return t?.ru || t?.uz || item.content.slug || '—';
  };

  return (
    <Card title="Контент в блоке" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => { setAddOpen(true); setContentType('movie'); loadContentOptions('movie'); }}>Добавить</Button>}>
      {items.length === 0 && !loading ? (
        <Empty description="Нет контента в этом блоке" />
      ) : (
        <Table dataSource={items} rowKey="id" loading={loading} pagination={false} size="small">
          <Table.Column title="#" dataIndex="sortOrder" width={50} />
          <Table.Column title="Тип" width={80} render={(_, r: any) => <Tag color={r.type === 'movie' ? 'blue' : 'purple'}>{r.type === 'movie' ? 'Фильм' : 'Сериал'}</Tag>} />
          <Table.Column title="Постер" width={60} render={(_, r: any) => r.content?.posterUrl ? <img src={r.content.posterUrl} style={{ width: 40, height: 56, objectFit: 'cover', borderRadius: 4 }} /> : null} />
          <Table.Column title="Название" render={(_, r: any) => <Text>{getTitle(r)}</Text>} />
          <Table.Column title="Год" width={60} render={(_, r: any) => r.content?.year || '—'} />
          <Table.Column title="" width={50} render={(_, r: any) => <Button danger size="small" icon={<DeleteOutlined />} onClick={() => handleRemove(r.id)} />} />
        </Table>
      )}

      <Modal title="Добавить контент" open={addOpen} onCancel={() => setAddOpen(false)} onOk={handleAdd} okText="Добавить" cancelText="Отмена" okButtonProps={{ disabled: !selectedId }}>
        <div style={{ marginBottom: 16 }}>
          <Text strong>Тип контента:</Text>
          <Select value={contentType} onChange={(v) => { setContentType(v); setSelectedId(null); loadContentOptions(v); }} style={{ width: '100%', marginTop: 4 }}>
            <Select.Option value="movie">Фильм</Select.Option>
            <Select.Option value="series">Сериал</Select.Option>
          </Select>
        </div>
        <div>
          <Text strong>Выберите:</Text>
          <Select
            showSearch
            value={selectedId}
            onChange={setSelectedId}
            options={contentOptions}
            optionFilterProp="label"
            style={{ width: '100%', marginTop: 4 }}
            placeholder="Начните вводить название..."
            size="large"
          />
        </div>
      </Modal>
    </Card>
  );
};

// ═══ Collection Form ═══
const CollectionForm: React.FC<{ isEdit?: boolean }> = ({ isEdit }) => {
  const { formProps, saveButtonProps, queryResult } = useForm({ resource: 'collections' });
  const collectionId = (queryResult as any)?.data?.data?.id;
  const Wrapper = isEdit ? Edit : Create;
  return (
    <Wrapper saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Card title="Настройки блока" style={{ marginBottom: 16 }}>
          <Form.Item label="Slug" name="slug" rules={[{ required: true }]} tooltip="Уникальный идентификатор, например: reality-show">
            <Input placeholder="my-block" />
          </Form.Item>
          <Form.Item label="Название" name="title" rules={[{ required: true }]}>
            <JsonbLangInput placeholder="Название блока" />
          </Form.Item>
          <Form.Item label="Тип" name="type" initialValue="manual">
            <Select>
              <Select.Option value="manual">Ручная подборка</Select.Option>
              <Select.Option value="auto_new">Авто: новинки</Select.Option>
              <Select.Option value="auto_top">Авто: топ по рейтингу</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="Порядок (чем меньше — тем выше)" name="sortOrder" initialValue={0}>
            <InputNumber style={{ width: 120 }} />
          </Form.Item>
          <Form.Item label="Активна" name="isActive" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
          <Form.Item name="page" hidden initialValue="home"><Input /></Form.Item>
        </Card>
      </Form>
      {isEdit && collectionId && (
        <div style={{ marginTop: 16 }}>
          <CollectionItems collectionId={collectionId} />
        </div>
      )}
    </Wrapper>
  );
};

export const CollectionCreate: React.FC = () => <CollectionForm />;
export const CollectionEdit: React.FC = () => <CollectionForm isEdit />;
