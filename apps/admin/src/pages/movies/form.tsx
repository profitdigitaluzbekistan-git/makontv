import React, { useState, useEffect, useRef } from 'react';
import { Create, Edit, useForm } from '@refinedev/antd';
import {
  Form, Input, InputNumber, Select, Switch, Row, Col,
  Steps, Button, Card, Typography, Space, Alert, Tag, Image, Tooltip,
} from 'antd';
import {
  VideoCameraOutlined, FileTextOutlined, TagOutlined,
  PictureOutlined, SettingOutlined, SendOutlined,
  CheckCircleFilled, CloseCircleFilled, LeftOutlined, RightOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { JsonbLangInput } from '../../components/JsonbLangInput';
import { FileUpload } from '../../components/FileUpload';
import { getAdminSecret } from '../../providers/dataProvider';

const { Title, Text, Paragraph } = Typography;

const API_BASE = (import.meta.env.VITE_API_URL || '') + '/admin';
const fetchAuth = (url: string, init?: RequestInit) =>
  fetch(url, { ...init, headers: { 'X-Admin-Secret': getAdminSecret(), 'Content-Type': 'application/json' } });

const STEPS = [
  { title: 'Видео', icon: <VideoCameraOutlined /> },
  { title: 'Информация', icon: <FileTextOutlined /> },
  { title: 'Жанры', icon: <TagOutlined /> },
  { title: 'Обложки', icon: <PictureOutlined /> },
  { title: 'Настройки', icon: <SettingOutlined /> },
  { title: 'Публикация', icon: <SendOutlined /> },
];

const MovieWizard: React.FC<{ isEdit?: boolean }> = ({ isEdit }) => {
  const [genreOptions, setGenreOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>([]);
  const selectedRef = useRef<string[]>([]);
  const genresReadyRef = useRef(!isEdit);
  selectedRef.current = selectedGenreIds;

  const [collectionOptions, setCollectionOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);
  const selectedCollRef = useRef<string[]>([]);
  const collectionsReadyRef = useRef(!isEdit);
  selectedCollRef.current = selectedCollectionIds;

  const { formProps, saveButtonProps, form, formLoading, queryResult } = useForm({
    resource: 'movies',
    redirect: 'list',
    onMutationSuccess: async (data: any) => {
      const movieId = data?.data?.id;
      if (!movieId || !genresReadyRef.current) return;
      const ids = selectedRef.current;
      try {
        if (isEdit) {
          const res = await fetchAuth(`${API_BASE}/movie-genres/${movieId}`);
          const existing: any[] = await res.json();
          const existingIds = existing.map((l: any) => l.genreId);
          await Promise.all([
            ...existingIds.filter(id => !ids.includes(id)).map(gid =>
              fetchAuth(`${API_BASE}/movie-genres/${movieId}/${gid}`, { method: 'DELETE' })),
            ...ids.filter(id => !existingIds.includes(id)).map(gid =>
              fetchAuth(`${API_BASE}/movie-genres`, { method: 'POST', body: JSON.stringify({ movieId, genreId: gid }) })),
          ]);
        } else if (ids.length > 0) {
          await Promise.all(ids.map(gid =>
            fetchAuth(`${API_BASE}/movie-genres`, { method: 'POST', body: JSON.stringify({ movieId, genreId: gid }) })));
        }
      } catch (e) { console.error('Genre sync error:', e); }

      // Sync collection items
      const collIds = selectedCollRef.current;
      try {
        // Fetch all collections to find existing links for this movie
        const allColls = await fetchAuth(`${API_BASE}/collections?_limit=200`).then(r => r.json());
        const existingCollIds: string[] = [];
        const existingItemMap: Record<string, string> = {}; // collectionId -> itemId
        for (const coll of allColls) {
          const itemsRes = await fetchAuth(`${API_BASE}/collection-items/${coll.id}`);
          const items: any[] = await itemsRes.json();
          const found = items.find((it: any) => it.movieId === movieId);
          if (found) {
            existingCollIds.push(coll.id);
            existingItemMap[coll.id] = found.id;
          }
        }
        // Remove from collections no longer selected
        await Promise.all(
          existingCollIds.filter(id => !collIds.includes(id)).map(cid =>
            fetchAuth(`${API_BASE}/collection-items/${existingItemMap[cid]}`, { method: 'DELETE' }))
        );
        // Add to newly selected collections
        await Promise.all(
          collIds.filter(id => !existingCollIds.includes(id)).map(cid =>
            fetchAuth(`${API_BASE}/collection-items`, { method: 'POST', body: JSON.stringify({ collectionId: cid, movieId, sortOrder: 99 }) }))
        );
      } catch (e) { console.error('Collection sync error:', e); }
    },
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [posterPreview, setPosterPreview] = useState('');
  const [backdropPreview, setBackdropPreview] = useState('');

  const formValues = Form.useWatch([], form);

  useEffect(() => {
    if (formValues?.posterUrl) setPosterPreview(formValues.posterUrl);
    else setPosterPreview('');
    if (formValues?.backdropUrl) setBackdropPreview(formValues.backdropUrl);
    else setBackdropPreview('');
  }, [formValues?.posterUrl, formValues?.backdropUrl]);

  // Fetch genre options
  useEffect(() => {
    fetchAuth(`${API_BASE}/genres?_limit=200`)
      .then(r => r.json())
      .then((data: any[]) => setGenreOptions(
        data.map(g => ({ value: g.id, label: g.name?.ru || g.name?.uz || g.slug || '—' }))
      ))
      .catch(() => {});
  }, []);

  // Fetch collection options
  useEffect(() => {
    fetchAuth(`${API_BASE}/collections?_limit=200`)
      .then(r => r.json())
      .then((data: any[]) => setCollectionOptions(
        data.map(c => ({ value: c.id, label: c.title?.ru || c.title?.uz || c.slug || '—' }))
      ))
      .catch(() => {});
  }, []);

  // Load existing genres in edit mode
  const editId = (queryResult as any)?.data?.data?.id;
  useEffect(() => {
    if (isEdit && editId) {
      fetchAuth(`${API_BASE}/movie-genres/${editId}`)
        .then(r => r.json())
        .then((links: any[]) => {
          setSelectedGenreIds(links.map(l => l.genreId));
          genresReadyRef.current = true;
        })
        .catch(() => { genresReadyRef.current = true; });
    }
  }, [isEdit, editId]);

  // Load existing collections in edit mode
  useEffect(() => {
    if (isEdit && editId) {
      fetchAuth(`${API_BASE}/collections?_limit=200`)
        .then(r => r.json())
        .then(async (allColls: any[]) => {
          const linked: string[] = [];
          for (const coll of allColls) {
            const itemsRes = await fetchAuth(`${API_BASE}/collection-items/${coll.id}`);
            const items: any[] = await itemsRes.json();
            if (items.some((it: any) => it.movieId === editId)) linked.push(coll.id);
          }
          setSelectedCollectionIds(linked);
          collectionsReadyRef.current = true;
        })
        .catch(() => { collectionsReadyRef.current = true; });
    }
  }, [isEdit, editId]);

  const next = () => setCurrentStep(Math.min(currentStep + 1, STEPS.length - 1));
  const prev = () => setCurrentStep(Math.max(currentStep - 1, 0));

  const getChecklist = () => {
    const v = form.getFieldsValue(true);
    const title = v?.title;
    const hasTitle = !!(title && (title.ru || title.uz));
    const hasPoster = !!v?.posterUrl;
    const hasVideo = !!v?.videoUrl;
    const hasSlug = !!v?.slug;
    return { hasTitle, hasPoster, hasVideo, hasSlug };
  };

  const handleSave = (status: 'draft' | 'published') => {
    form.setFieldsValue({ isPublished: status === 'published' });
    saveButtonProps.onClick?.({} as any);
  };

  const Wrapper = isEdit ? Edit : Create;

  return (
    <Wrapper
      saveButtonProps={{ style: { display: 'none' } }}
      title={isEdit ? 'Редактировать фильм' : 'Новый фильм'}
      headerButtons={() => null}
    >
      <Steps
        current={currentStep}
        onChange={setCurrentStep}
        items={STEPS}
        size="small"
        style={{ marginBottom: 24 }}
      />

      <Form {...formProps} layout="vertical" style={{ minHeight: 400 }}>
        <Form.Item name="isPublished" hidden><Input /></Form.Item>
        <Form.Item name="sortOrder" hidden><InputNumber /></Form.Item>
        <Form.Item name="rating" hidden><InputNumber /></Form.Item>
        <Form.Item name="ratingCount" hidden><InputNumber /></Form.Item>

        {/* STEP 1: VIDEO */}
        <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
          <Card>
            <Title level={4}>Видео</Title>
            <Paragraph type="secondary">
              Вставьте ссылку на YouTube или прямую ссылку на видеофайл
            </Paragraph>
            <Form.Item label="Ссылка на фильм" name="videoUrl" tooltip="YouTube, прямая ссылка или HLS поток">
              <FileUpload folder="videos" accept="video/*" presigned />
            </Form.Item>
            <Form.Item label="Тип видео" name="videoType" initialValue="url">
              <Select>
                <Select.Option value="url">Прямая ссылка (MP4)</Select.Option>
                <Select.Option value="youtube">YouTube</Select.Option>
                <Select.Option value="hls">HLS Stream (m3u8)</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item label="Ссылка на трейлер" name="trailerUrl" tooltip="Необязательно. Будет показан на странице фильма">
              <Input placeholder="https://youtube.com/watch?v=..." />
            </Form.Item>
            <Alert message="Загрузка файлов скоро будет доступна" description="Сейчас поддерживаются только ссылки. Загрузка видео на сервер появится в следующем обновлении." type="info" showIcon style={{ marginTop: 16 }} />
          </Card>
        </div>

        {/* STEP 2: INFO */}
        <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
          <Card>
            <Title level={4}>Основная информация</Title>
            <Form.Item
              label={<>Название <Text type="danger">*</Text></>}
              name="title"
              rules={[{ validator: (_, value) => (!value || (!value.ru && !value.uz)) ? Promise.reject('Заполните название хотя бы на одном языке') : Promise.resolve() }]}
            >
              <JsonbLangInput placeholder="Название фильма" />
            </Form.Item>
            <Form.Item label="Краткое описание" name="shortDesc">
              <JsonbLangInput placeholder="Для карточки (1-2 предложения)" />
            </Form.Item>
            <Form.Item label="Полное описание" name="description">
              <JsonbLangInput textarea placeholder="Подробное описание для страницы фильма" />
            </Form.Item>
            <Row gutter={16}>
              <Col span={6}>
                <Form.Item label="Slug (URL)" name="slug" rules={[{ required: true, message: 'Slug обязателен' }]} tooltip="Используется в URL: /movies/slug-filma">
                  <Input placeholder="moy-film" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="Год выхода" name="year">
                  <InputNumber style={{ width: '100%' }} min={1900} max={2030} placeholder="2024" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="Длительность (мин)" name="durationMin" tooltip="В минутах">
                  <InputNumber style={{ width: '100%' }} min={1} placeholder="120" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="Страна" name="country">
                  <JsonbLangInput placeholder="Узбекистан" />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        </div>

        {/* STEP 3: GENRES */}
        <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>
          <Card>
            <Title level={4}>Жанры</Title>
            <Paragraph type="secondary">Выберите жанры для фильма. Можно выбрать несколько.</Paragraph>
            <Select
              mode="multiple"
              placeholder="Выберите жанры..."
              value={selectedGenreIds}
              onChange={setSelectedGenreIds}
              options={genreOptions}
              style={{ width: '100%' }}
              size="large"
              optionFilterProp="label"
              showSearch
              notFoundContent="Нет жанров. Создайте их в разделе «Жанры»."
            />
            {selectedGenreIds.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <Text type="secondary">Выбрано жанров: {selectedGenreIds.length}</Text>
              </div>
            )}
          </Card>
        </div>

        {/* STEP 4: COVERS */}
        <div style={{ display: currentStep === 3 ? 'block' : 'none' }}>
          <Card>
            <Title level={4}>Обложки</Title>
            <Paragraph type="secondary">Вставьте ссылки на изображения. Постер обязателен для публикации.</Paragraph>
            <Row gutter={24}>
              <Col span={12}>
                <Form.Item label={<>Постер <Text type="danger">*</Text> <Tooltip title="Вертикальное изображение для карточки фильма"><InfoCircleOutlined /></Tooltip></>} name="posterUrl">
                  <FileUpload folder="posters" accept="image/*" />
                </Form.Item>
                {posterPreview && (
                  <div style={{ textAlign: 'center', marginTop: 8 }}>
                    <Image src={posterPreview} width={150} height={220} style={{ objectFit: 'cover', borderRadius: 8 }} fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjIyMCI+PHJlY3Qgd2lkdGg9IjE1MCIgaGVpZ2h0PSIyMjAiIGZpbGw9IiMxYTFhMmUiLz48L3N2Zz4=" />
                    <div><Text type="secondary" style={{ fontSize: 12 }}>Превью постера</Text></div>
                  </div>
                )}
              </Col>
              <Col span={12}>
                <Form.Item label={<>Фон (backdrop) <Tooltip title="Горизонтальное изображение для hero-баннера"><InfoCircleOutlined /></Tooltip></>} name="backdropUrl">
                  <FileUpload folder="backdrops" accept="image/*" />
                </Form.Item>
                {backdropPreview && (
                  <div style={{ textAlign: 'center', marginTop: 8 }}>
                    <Image src={backdropPreview} width={300} height={170} style={{ objectFit: 'cover', borderRadius: 8 }} fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjE3MCI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIxNzAiIGZpbGw9IiMxYTFhMmUiLz48L3N2Zz4=" />
                    <div><Text type="secondary" style={{ fontSize: 12 }}>Превью фона</Text></div>
                  </div>
                )}
              </Col>
            </Row>
          </Card>
        </div>

        {/* STEP 5: SETTINGS */}
        <div style={{ display: currentStep === 4 ? 'block' : 'none' }}>
          <Card>
            <Title level={4}>Настройки</Title>
            <Row gutter={24}>
              <Col span={8}>
                <Form.Item label="Возрастной рейтинг" name="ageRating" tooltip="Возрастное ограничение для контента">
                  <Select allowClear placeholder="Выберите">
                    <Select.Option value="0+">0+ (Для всех)</Select.Option>
                    <Select.Option value="6+">6+</Select.Option>
                    <Select.Option value="12+">12+</Select.Option>
                    <Select.Option value="16+">16+</Select.Option>
                    <Select.Option value="18+">18+ (Взрослый контент)</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Качество видео" name="quality" tooltip="Максимальное доступное качество">
                  <Select>
                    <Select.Option value="HD">HD (720p)</Select.Option>
                    <Select.Option value="FHD">Full HD (1080p)</Select.Option>
                    <Select.Option value="4K">4K (2160p)</Select.Option>
                    <Select.Option value="4K+HDR">4K + HDR</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={24} style={{ marginTop: 16 }}>
              <Col span={8}>
                <Card size="small" style={{ background: '#1a1a2e' }}>
                  <Form.Item name="isPremium" valuePropName="checked" style={{ marginBottom: 0 }}><Switch /></Form.Item>
                  <Text strong style={{ display: 'block', marginTop: 8 }}>Premium контент</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>Только для подписчиков платных тарифов</Text>
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small" style={{ background: '#1a1a2e' }}>
                  <Form.Item name="featured" valuePropName="checked" style={{ marginBottom: 0 }}><Switch /></Form.Item>
                  <Text strong style={{ display: 'block', marginTop: 8 }}>Hero-баннер</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>Показывать в большом баннере на главной странице</Text>
                </Card>
              </Col>
            </Row>
            <div style={{ marginTop: 24 }}>
              <Title level={5}>Блоки главной страницы</Title>
              <Paragraph type="secondary">Выберите, в каких блоках на главной странице будет отображаться этот фильм.</Paragraph>
              <Select
                mode="multiple"
                placeholder="Выберите блоки..."
                value={selectedCollectionIds}
                onChange={setSelectedCollectionIds}
                options={collectionOptions}
                style={{ width: '100%' }}
                size="large"
                optionFilterProp="label"
                showSearch
                notFoundContent="Нет блоков. Создайте их в разделе «Блоки главной»."
              />
              {selectedCollectionIds.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary">Выбрано блоков: {selectedCollectionIds.length}</Text>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* STEP 6: PUBLISH */}
        <div style={{ display: currentStep === 5 ? 'block' : 'none' }}>
          <Row gutter={24}>
            <Col span={14}>
              <Card>
                <Title level={4}>Публикация</Title>
                {(() => {
                  const checks = getChecklist();
                  return (
                    <div style={{ marginBottom: 24 }}>
                      <Title level={5}>Чеклист готовности</Title>
                      <Space direction="vertical" size={8}>
                        <div>{checks.hasSlug ? <CheckCircleFilled style={{ color: '#52c41a', marginRight: 8 }} /> : <CloseCircleFilled style={{ color: '#ff4d4f', marginRight: 8 }} />}<Text>Slug заполнен</Text></div>
                        <div>{checks.hasTitle ? <CheckCircleFilled style={{ color: '#52c41a', marginRight: 8 }} /> : <CloseCircleFilled style={{ color: '#ff4d4f', marginRight: 8 }} />}<Text>Название заполнено</Text></div>
                        <div>{checks.hasPoster ? <CheckCircleFilled style={{ color: '#52c41a', marginRight: 8 }} /> : <CloseCircleFilled style={{ color: '#ff4d4f', marginRight: 8 }} />}<Text>Постер добавлен</Text></div>
                        <div>{checks.hasVideo ? <CheckCircleFilled style={{ color: '#52c41a', marginRight: 8 }} /> : <CloseCircleFilled style={{ color: '#ff4d4f', marginRight: 8 }} />}<Text>Видео указано</Text></div>
                      </Space>
                      {(!checks.hasTitle || !checks.hasSlug) && (
                        <Alert message="Нельзя сохранить без названия и slug" type="error" showIcon style={{ marginTop: 16 }} />
                      )}
                      {checks.hasTitle && checks.hasSlug && (!checks.hasPoster || !checks.hasVideo) && (
                        <Alert message="Можно сохранить как черновик, но для публикации нужны постер и видео" type="warning" showIcon style={{ marginTop: 16 }} />
                      )}
                    </div>
                  );
                })()}
                <Space size={16}>
                  <Button size="large" onClick={() => handleSave('draft')} disabled={formLoading}>Сохранить как черновик</Button>
                  <Button type="primary" size="large" onClick={() => handleSave('published')} disabled={formLoading}>Опубликовать</Button>
                </Space>
              </Card>
            </Col>
            <Col span={10}>
              <Card>
                <Title level={5}>Превью карточки</Title>
                <div style={{ background: '#0f0f1a', borderRadius: 12, overflow: 'hidden', width: 200, margin: '0 auto' }}>
                  {posterPreview ? (
                    <img src={posterPreview} alt="poster" style={{ width: '100%', height: 280, objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div style={{ width: '100%', height: 280, background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Text type="secondary">Нет постера</Text>
                    </div>
                  )}
                  <div style={{ padding: '8px 12px' }}>
                    <Text strong ellipsis style={{ display: 'block' }}>{formValues?.title?.ru || formValues?.title?.uz || 'Название фильма'}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{formValues?.year || '---'} {formValues?.quality && <Tag color="blue" style={{ fontSize: 10 }}>{formValues.quality}</Tag>}</Text>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      </Form>

      {/* NAVIGATION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, paddingTop: 16, borderTop: '1px solid #2a2a3e' }}>
        <Button onClick={prev} disabled={currentStep === 0} icon={<LeftOutlined />}>Назад</Button>
        <div>{currentStep < STEPS.length - 1 && <Button type="primary" onClick={next} icon={<RightOutlined />}>Далее</Button>}</div>
      </div>
    </Wrapper>
  );
};

export const MovieCreate: React.FC = () => <MovieWizard />;
export const MovieEdit: React.FC = () => <MovieWizard isEdit />;
