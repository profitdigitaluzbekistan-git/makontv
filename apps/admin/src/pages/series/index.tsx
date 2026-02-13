import React, { useState, useEffect, useCallback } from 'react';
import { List, Create, Edit, useTable, useForm } from '@refinedev/antd';
import {
  Table, Form, Input, InputNumber, Select, Switch, Tag, Space, Row, Col,
  Steps, Button, Card, Typography, Tabs, Modal, Collapse, Image, Alert,
  Tooltip, Popconfirm, Empty, Badge,
} from 'antd';
import { EditButton, DeleteButton } from '@refinedev/antd';
import {
  VideoCameraOutlined, FileTextOutlined, PictureOutlined,
  SettingOutlined, SendOutlined, LeftOutlined, RightOutlined,
  PlusOutlined, DeleteOutlined, EditOutlined, InfoCircleOutlined,
  CheckCircleFilled, CloseCircleFilled, SearchOutlined,
  OrderedListOutlined, PlayCircleOutlined,
} from '@ant-design/icons';
import { JsonbLangInput, JsonbLangDisplay } from '../../components/JsonbLangInput';
import { useNavigation, useCustom, useApiUrl } from '@refinedev/core';
import { getAdminSecret } from '../../providers/dataProvider';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

// ═══════════════════════════════
// SERIES LIST (with status tabs)
// ═══════════════════════════════
export const SeriesList: React.FC = () => {
  const [activeTab, setActiveTab] = useState('all');
  const { tableProps, setFilters } = useTable({
    resource: 'series',
    sorters: { initial: [{ field: 'createdAt', order: 'desc' }] },
  });

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    if (key === 'published') setFilters([{ field: 'isPublished', operator: 'eq', value: true }]);
    else if (key === 'drafts') setFilters([{ field: 'isPublished', operator: 'eq', value: false }]);
    else setFilters([]);
  };

  return (
    <List resource="series">
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={[
            { key: 'all', label: 'Все' },
            { key: 'published', label: 'Опубликованные' },
            { key: 'drafts', label: 'Черновики' },
          ]}
          style={{ marginBottom: 0 }}
        />
      </div>
      <Table {...tableProps} rowKey="id" scroll={{ x: 1000 }}>
        <Table.Column title="Постер" dataIndex="posterUrl" width={80}
          render={(url) => url ? <Image src={url} width={50} height={70} style={{ objectFit: 'cover', borderRadius: 4 }} /> : <div style={{ width: 50, height: 70, background: '#1a1a2e', borderRadius: 4 }} />}
        />
        <Table.Column title="Название" dataIndex="title" render={(v) => <JsonbLangDisplay value={v} />} />
        <Table.Column title="Год" dataIndex="year" width={70} sorter />
        <Table.Column title="Качество" dataIndex="quality" width={80} render={(v) => v ? <Tag color="blue">{v}</Tag> : null} />
        <Table.Column title="Статус" dataIndex="isPublished" width={180}
          render={(val, rec: any) => (
            <Space>
              {val ? <Tag color="green">Опубликовано</Tag> : <Tag color="default">Черновик</Tag>}
              {rec.isPremium && <Tag color="gold">Premium</Tag>}
              {rec.featured && <Tag color="cyan">Hero</Tag>}
            </Space>
          )}
        />
        <Table.Column title="" width={120} render={(_, r: any) => (
          <Space>
            <EditButton hideText size="small" recordItemId={r.id} resource="series" />
            <DeleteButton hideText size="small" recordItemId={r.id} resource="series" />
          </Space>
        )} />
      </Table>
    </List>
  );
};

// ═══════════════════════════════
// SERIES WIZARD (create)
// ═══════════════════════════════
const STEPS = [
  { title: 'Информация', icon: <FileTextOutlined /> },
  { title: 'Обложки', icon: <PictureOutlined /> },
  { title: 'Настройки', icon: <SettingOutlined /> },
  { title: 'Публикация', icon: <SendOutlined /> },
];

const SeriesWizard: React.FC<{ isEdit?: boolean }> = ({ isEdit }) => {
  const { formProps, saveButtonProps, form, formLoading } = useForm({
    resource: 'series',
    redirect: isEdit ? false : 'list',
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [posterPreview, setPosterPreview] = useState('');
  const [activeDetailTab, setActiveDetailTab] = useState('info');

  // For edit mode: load seasons and episodes
  const [seasonsData, setSeasonsData] = useState<any[]>([]);
  const [loadingSeasons, setLoadingSeasons] = useState(false);
  const [episodeModal, setEpisodeModal] = useState<{ visible: boolean; seasonId?: string; episode?: any }>({ visible: false });
  const [seasonModal, setSeasonModal] = useState<{ visible: boolean; season?: any }>({ visible: false });
  const [episodeForm] = Form.useForm();
  const [seasonForm] = Form.useForm();

  const apiUrl = (import.meta.env.VITE_API_URL || '') + '/admin';
  const secret = getAdminSecret();

  const formValues = Form.useWatch([], form);

  useEffect(() => {
    if (formValues?.posterUrl) setPosterPreview(formValues.posterUrl);
    else setPosterPreview('');
  }, [formValues?.posterUrl]);

  const seriesId = isEdit ? (formProps.initialValues as any)?.id : null;

  // Fetch seasons + episodes for this series
  const fetchSeasons = useCallback(async () => {
    if (!seriesId) return;
    setLoadingSeasons(true);
    try {
      const headers: Record<string, string> = { 'X-Admin-Secret': secret, 'Content-Type': 'application/json' };
      const res = await fetch(`${apiUrl}/seasons?_limit=100&seriesId=${seriesId}`, { headers });
      const allSeasons = await res.json();
      const filtered = (Array.isArray(allSeasons) ? allSeasons : []).filter((s: any) => s.seriesId === seriesId);
      filtered.sort((a: any, b: any) => (a.number || 0) - (b.number || 0));

      // Load episodes for each season
      for (const season of filtered) {
        const epsRes = await fetch(`${apiUrl}/episodes?_limit=100&seasonId=${season.id}`, { headers });
        const allEps = await epsRes.json();
        season.episodes = (Array.isArray(allEps) ? allEps : [])
          .filter((e: any) => e.seasonId === season.id)
          .sort((a: any, b: any) => (a.number || 0) - (b.number || 0));
      }
      setSeasonsData(filtered);
    } catch (e) {
      console.error('Failed to load seasons', e);
    }
    setLoadingSeasons(false);
  }, [seriesId, apiUrl, secret]);

  useEffect(() => {
    if (isEdit && seriesId) fetchSeasons();
  }, [isEdit, seriesId, fetchSeasons]);

  const apiFetch = (url: string, method: string, body?: any) =>
    fetch(`${apiUrl}${url}`, {
      method,
      headers: { 'X-Admin-Secret': secret, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });

  // Season CRUD
  const handleAddSeason = async (values: any) => {
    await apiFetch('/seasons', 'POST', { ...values, seriesId });
    seasonModal.visible = false;
    setSeasonModal({ visible: false });
    seasonForm.resetFields();
    fetchSeasons();
  };

  const handleDeleteSeason = async (id: string) => {
    await apiFetch(`/seasons/${id}`, 'DELETE');
    fetchSeasons();
  };

  // Episode CRUD
  const handleSaveEpisode = async (values: any) => {
    if (episodeModal.episode) {
      await apiFetch(`/episodes/${episodeModal.episode.id}`, 'PUT', values);
    } else {
      await apiFetch('/episodes', 'POST', { ...values, seasonId: episodeModal.seasonId });
    }
    setEpisodeModal({ visible: false });
    episodeForm.resetFields();
    fetchSeasons();
  };

  const handleDeleteEpisode = async (id: string) => {
    await apiFetch(`/episodes/${id}`, 'DELETE');
    fetchSeasons();
  };

  const next = () => setCurrentStep(Math.min(currentStep + 1, STEPS.length - 1));
  const prev = () => setCurrentStep(Math.max(currentStep - 1, 0));

  const getChecklist = () => {
    const v = form.getFieldsValue(true);
    const title = v?.title;
    return {
      hasTitle: !!(title && (title.ru || title.uz)),
      hasPoster: !!v?.posterUrl,
      hasSlug: !!v?.slug,
    };
  };

  const handleSave = (status: 'draft' | 'published') => {
    form.setFieldsValue({ isPublished: status === 'published' });
    saveButtonProps.onClick?.({} as any);
  };

  const Wrapper = isEdit ? Edit : Create;

  // ═══ EDIT MODE: show tabs (Info | Seasons) ═══
  if (isEdit) {
    return (
      <Wrapper
        saveButtonProps={saveButtonProps}
        title="Редактировать сериал"
      >
        <Tabs activeKey={activeDetailTab} onChange={setActiveDetailTab} items={[
          { key: 'info', label: 'Информация' },
          { key: 'seasons', label: `Сезоны и серии (${seasonsData.length})` },
        ]} />

        {activeDetailTab === 'info' && (
          <Form {...formProps} layout="vertical">
            <Form.Item name="isPublished" hidden><Input /></Form.Item>
            <Form.Item name="sortOrder" hidden><InputNumber /></Form.Item>
            <Form.Item name="rating" hidden><InputNumber /></Form.Item>
            <Form.Item name="ratingCount" hidden><InputNumber /></Form.Item>

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
            <Form.Item label="Краткое описание" name="shortDesc"><JsonbLangInput /></Form.Item>
            <Row gutter={16}>
              <Col span={8}><Form.Item label="Возраст" name="ageRating">
                <Select allowClear><Select.Option value="0+">0+</Select.Option><Select.Option value="6+">6+</Select.Option><Select.Option value="12+">12+</Select.Option><Select.Option value="16+">16+</Select.Option><Select.Option value="18+">18+</Select.Option></Select>
              </Form.Item></Col>
              <Col span={8}><Form.Item label="Страна" name="country"><JsonbLangInput placeholder="Узбекистан" /></Form.Item></Col>
            </Row>
            <Form.Item label="Постер URL" name="posterUrl"><Input /></Form.Item>
            <Form.Item label="Фон URL" name="backdropUrl"><Input /></Form.Item>
            <Form.Item label="Трейлер URL" name="trailerUrl"><Input /></Form.Item>
            <Row gutter={16}>
              <Col span={6}><Form.Item label="Опубликован" name="isPublished" valuePropName="checked"><Switch /></Form.Item></Col>
              <Col span={6}><Form.Item label="Premium" name="isPremium" valuePropName="checked"><Switch /></Form.Item></Col>
              <Col span={6}><Form.Item label="Hero" name="featured" valuePropName="checked"><Switch /></Form.Item></Col>
              <Col span={6}><Form.Item label="Порядок" name="sortOrder"><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
            </Row>
          </Form>
        )}

        {activeDetailTab === 'seasons' && (
          <div>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
              <Title level={5} style={{ margin: 0 }}>Сезоны</Title>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                seasonForm.resetFields();
                seasonForm.setFieldsValue({ number: seasonsData.length + 1 });
                setSeasonModal({ visible: true });
              }}>Добавить сезон</Button>
            </div>

            {seasonsData.length === 0 && !loadingSeasons && (
              <Empty description="Нет сезонов. Добавьте первый сезон." />
            )}

            <Collapse accordion>
              {seasonsData.map((season) => (
                <Panel
                  key={season.id}
                  header={
                    <Space>
                      <Badge count={season.episodes?.length || 0} size="small" style={{ backgroundColor: '#6bf1f6', color: '#0f0f1a' }}>
                        <Tag color="blue">Сезон {season.number}</Tag>
                      </Badge>
                      <JsonbLangDisplay value={season.title} />
                    </Space>
                  }
                  extra={
                    <Popconfirm title="Удалить сезон и все его серии?" onConfirm={(e) => { e?.stopPropagation(); handleDeleteSeason(season.id); }} onCancel={(e) => e?.stopPropagation()}>
                      <Button danger size="small" icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()} />
                    </Popconfirm>
                  }
                >
                  <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => {
                      episodeForm.resetFields();
                      episodeForm.setFieldsValue({ number: (season.episodes?.length || 0) + 1, videoType: 'url' });
                      setEpisodeModal({ visible: true, seasonId: season.id });
                    }}>Добавить серию</Button>
                  </div>

                  {(!season.episodes || season.episodes.length === 0) ? (
                    <Empty description="Нет серий" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  ) : (
                    <Table dataSource={season.episodes} rowKey="id" pagination={false} size="small">
                      <Table.Column title="№" dataIndex="number" width={50} />
                      <Table.Column title="Название" dataIndex="title" render={(v) => <JsonbLangDisplay value={v} />} />
                      <Table.Column title="Мин" dataIndex="durationMin" width={60} />
                      <Table.Column title="Видео" dataIndex="videoUrl" width={200} ellipsis render={(v) => v ? <Text copyable={{ text: v }} type="secondary" style={{ fontSize: 12 }}>{v.substring(0, 30)}...</Text> : <Text type="secondary">---</Text>} />
                      <Table.Column title="Бесплатно" dataIndex="isFree" width={90} render={(v) => v ? <Tag color="green">Да</Tag> : <Tag>Нет</Tag>} />
                      <Table.Column title="" width={100} render={(_, ep: any) => (
                        <Space>
                          <Button size="small" icon={<EditOutlined />} onClick={() => {
                            episodeForm.setFieldsValue(ep);
                            setEpisodeModal({ visible: true, seasonId: season.id, episode: ep });
                          }} />
                          <Popconfirm title="Удалить серию?" onConfirm={() => handleDeleteEpisode(ep.id)}>
                            <Button size="small" danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        </Space>
                      )} />
                    </Table>
                  )}
                </Panel>
              ))}
            </Collapse>

            {/* Season Modal */}
            <Modal
              title="Новый сезон"
              open={seasonModal.visible}
              onCancel={() => setSeasonModal({ visible: false })}
              onOk={() => seasonForm.submit()}
              okText="Добавить"
            >
              <Form form={seasonForm} layout="vertical" onFinish={handleAddSeason}>
                <Form.Item label="Номер сезона" name="number" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
                <Form.Item label="Название" name="title"><JsonbLangInput /></Form.Item>
                <Form.Item label="Описание" name="description"><JsonbLangInput textarea /></Form.Item>
                <Form.Item label="Постер URL" name="posterUrl"><Input placeholder="https://..." /></Form.Item>
              </Form>
            </Modal>

            {/* Episode Modal */}
            <Modal
              title={episodeModal.episode ? 'Редактировать серию' : 'Новая серия'}
              open={episodeModal.visible}
              onCancel={() => { setEpisodeModal({ visible: false }); episodeForm.resetFields(); }}
              onOk={() => episodeForm.submit()}
              okText={episodeModal.episode ? 'Сохранить' : 'Добавить'}
              width={600}
            >
              <Form form={episodeForm} layout="vertical" onFinish={handleSaveEpisode}>
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item label="Номер серии" name="number" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="Длительность (мин)" name="durationMin"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item label="Бесплатный" name="isFree" valuePropName="checked"><Switch /></Form.Item>
                  </Col>
                </Row>
                <Form.Item label="Название" name="title" rules={[{ required: true }]}><JsonbLangInput /></Form.Item>
                <Form.Item label="Описание" name="description"><JsonbLangInput textarea /></Form.Item>
                <Form.Item label="Видео URL" name="videoUrl"><Input placeholder="https://youtube.com/watch?v=... или прямая ссылка" /></Form.Item>
                <Form.Item label="Тип видео" name="videoType" initialValue="url">
                  <Select>
                    <Select.Option value="url">Прямая ссылка</Select.Option>
                    <Select.Option value="youtube">YouTube</Select.Option>
                    <Select.Option value="hls">HLS</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item label="Превью URL" name="thumbnailUrl"><Input placeholder="https://..." /></Form.Item>
              </Form>
            </Modal>
          </div>
        )}
      </Wrapper>
    );
  }

  // ═══ CREATE MODE: wizard ═══
  return (
    <Wrapper
      saveButtonProps={{ style: { display: 'none' } }}
      title="Новый сериал"
      headerButtons={() => null}
    >
      <Steps current={currentStep} onChange={setCurrentStep} items={STEPS} size="small" style={{ marginBottom: 24 }} />

      <Form {...formProps} layout="vertical" style={{ minHeight: 400 }}>
        <Form.Item name="isPublished" hidden><Input /></Form.Item>
        <Form.Item name="sortOrder" hidden><InputNumber /></Form.Item>
        <Form.Item name="rating" hidden><InputNumber /></Form.Item>
        <Form.Item name="ratingCount" hidden><InputNumber /></Form.Item>

        {/* STEP 1: INFO */}
        <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
          <Card>
            <Title level={4}>Основная информация</Title>
            <Form.Item label={<>Название <Text type="danger">*</Text></>} name="title"
              rules={[{ validator: (_, v) => (!v || (!v.ru && !v.uz)) ? Promise.reject('Заполните название') : Promise.resolve() }]}>
              <JsonbLangInput placeholder="Название сериала" />
            </Form.Item>
            <Form.Item label="Краткое описание" name="shortDesc"><JsonbLangInput placeholder="Для карточки" /></Form.Item>
            <Form.Item label="Полное описание" name="description"><JsonbLangInput textarea placeholder="Подробное описание" /></Form.Item>
            <Row gutter={16}>
              <Col span={6}><Form.Item label="Slug (URL)" name="slug" rules={[{ required: true, message: 'Slug обязателен' }]}><Input placeholder="moy-serial" /></Form.Item></Col>
              <Col span={6}><Form.Item label="Год" name="year"><InputNumber style={{ width: '100%' }} min={1900} max={2030} /></Form.Item></Col>
              <Col span={6}><Form.Item label="Качество" name="quality"><Select><Select.Option value="HD">HD</Select.Option><Select.Option value="4K">4K</Select.Option></Select></Form.Item></Col>
              <Col span={6}><Form.Item label="Страна" name="country"><JsonbLangInput placeholder="Узбекистан" /></Form.Item></Col>
            </Row>
            <Form.Item label="Трейлер URL" name="trailerUrl"><Input placeholder="https://youtube.com/watch?v=..." /></Form.Item>
          </Card>
        </div>

        {/* STEP 2: COVERS */}
        <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
          <Card>
            <Title level={4}>Обложки</Title>
            <Row gutter={24}>
              <Col span={12}>
                <Form.Item label={<>Постер <Text type="danger">*</Text></>} name="posterUrl"><Input placeholder="https://example.com/poster.jpg" /></Form.Item>
                {posterPreview && <div style={{ textAlign: 'center' }}><Image src={posterPreview} width={150} height={220} style={{ objectFit: 'cover', borderRadius: 8 }} /></div>}
              </Col>
              <Col span={12}>
                <Form.Item label="Фон (backdrop)" name="backdropUrl"><Input placeholder="https://example.com/backdrop.jpg" /></Form.Item>
              </Col>
            </Row>
          </Card>
        </div>

        {/* STEP 3: SETTINGS */}
        <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>
          <Card>
            <Title level={4}>Настройки</Title>
            <Row gutter={24}>
              <Col span={8}><Form.Item label="Возрастной рейтинг" name="ageRating">
                <Select allowClear placeholder="Выберите"><Select.Option value="0+">0+</Select.Option><Select.Option value="6+">6+</Select.Option><Select.Option value="12+">12+</Select.Option><Select.Option value="16+">16+</Select.Option><Select.Option value="18+">18+</Select.Option></Select>
              </Form.Item></Col>
            </Row>
            <Row gutter={24} style={{ marginTop: 16 }}>
              <Col span={8}><Card size="small" style={{ background: '#1a1a2e' }}><Form.Item name="isPremium" valuePropName="checked" style={{ marginBottom: 0 }}><Switch /></Form.Item><Text strong style={{ display: 'block', marginTop: 8 }}>Premium</Text><Text type="secondary" style={{ fontSize: 12 }}>Только для платных подписчиков</Text></Card></Col>
              <Col span={8}><Card size="small" style={{ background: '#1a1a2e' }}><Form.Item name="featured" valuePropName="checked" style={{ marginBottom: 0 }}><Switch /></Form.Item><Text strong style={{ display: 'block', marginTop: 8 }}>Hero-баннер</Text><Text type="secondary" style={{ fontSize: 12 }}>На главной странице</Text></Card></Col>
            </Row>
          </Card>
        </div>

        {/* STEP 4: PUBLISH */}
        <div style={{ display: currentStep === 3 ? 'block' : 'none' }}>
          <Card>
            <Title level={4}>Публикация</Title>
            {(() => {
              const checks = getChecklist();
              return (
                <div style={{ marginBottom: 24 }}>
                  <Title level={5}>Чеклист</Title>
                  <Space direction="vertical" size={8}>
                    <div>{checks.hasSlug ? <CheckCircleFilled style={{ color: '#52c41a', marginRight: 8 }} /> : <CloseCircleFilled style={{ color: '#ff4d4f', marginRight: 8 }} />}<Text>Slug заполнен</Text></div>
                    <div>{checks.hasTitle ? <CheckCircleFilled style={{ color: '#52c41a', marginRight: 8 }} /> : <CloseCircleFilled style={{ color: '#ff4d4f', marginRight: 8 }} />}<Text>Название заполнено</Text></div>
                    <div>{checks.hasPoster ? <CheckCircleFilled style={{ color: '#52c41a', marginRight: 8 }} /> : <CloseCircleFilled style={{ color: '#ff4d4f', marginRight: 8 }} />}<Text>Постер добавлен</Text></div>
                  </Space>
                  {(!checks.hasTitle || !checks.hasSlug) && <Alert message="Нельзя сохранить без названия и slug" type="error" showIcon style={{ marginTop: 16 }} />}
                </div>
              );
            })()}
            <Space size={16}>
              <Button size="large" onClick={() => handleSave('draft')} disabled={formLoading}>Сохранить как черновик</Button>
              <Button type="primary" size="large" onClick={() => handleSave('published')} disabled={formLoading}>Опубликовать</Button>
            </Space>
            <Alert message="Сезоны и серии можно добавить после создания сериала" type="info" showIcon style={{ marginTop: 24 }} />
          </Card>
        </div>
      </Form>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, paddingTop: 16, borderTop: '1px solid #2a2a3e' }}>
        <Button onClick={prev} disabled={currentStep === 0} icon={<LeftOutlined />}>Назад</Button>
        <div>{currentStep < STEPS.length - 1 && <Button type="primary" onClick={next} icon={<RightOutlined />}>Далее</Button>}</div>
      </div>
    </Wrapper>
  );
};

export const SeriesCreate: React.FC = () => <SeriesWizard />;
export const SeriesEdit: React.FC = () => <SeriesWizard isEdit />;
