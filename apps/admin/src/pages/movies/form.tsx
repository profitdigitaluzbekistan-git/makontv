import React from 'react';
import { Create, Edit, useForm } from '@refinedev/antd';
import {
  Form, Input, InputNumber, Select, Switch, Divider, Row, Col,
} from 'antd';
import { JsonbLangInput } from '../../components/JsonbLangInput';
import { FileUpload } from '../../components/FileUpload';

const MovieForm: React.FC<{ isEdit?: boolean }> = ({ isEdit }) => {
  const { formProps, saveButtonProps } = useForm({ resource: 'movies' });

  const Wrapper = isEdit ? Edit : Create;

  return (
    <Wrapper saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Divider orientation="left">Основная информация</Divider>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Slug (URL)" name="slug" rules={[{ required: true }]}>
              <Input placeholder="ten-samarkanda" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Год" name="year">
              <InputNumber style={{ width: '100%' }} min={1900} max={2030} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Длительность (мин)" name="durationMin">
              <InputNumber style={{ width: '100%' }} min={1} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Название" name="title" rules={[{ required: true }]}>
          <JsonbLangInput placeholder="Название фильма" />
        </Form.Item>

        <Form.Item label="Краткое описание" name="shortDesc">
          <JsonbLangInput placeholder="Для карточки" />
        </Form.Item>

        <Form.Item label="Полное описание" name="description">
          <JsonbLangInput textarea placeholder="Для страницы деталей" />
        </Form.Item>

        <Divider orientation="left">Метаданные</Divider>
        <Row gutter={16}>
          <Col span={6}>
            <Form.Item label="Рейтинг" name="rating">
              <InputNumber style={{ width: '100%' }} min={0} max={10} step={0.1} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Кол-во оценок" name="ratingCount">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Возраст" name="ageRating">
              <Select allowClear placeholder="16+">
                <Select.Option value="0+">0+</Select.Option>
                <Select.Option value="6+">6+</Select.Option>
                <Select.Option value="12+">12+</Select.Option>
                <Select.Option value="16+">16+</Select.Option>
                <Select.Option value="18+">18+</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Качество" name="quality">
              <Select>
                <Select.Option value="HD">HD</Select.Option>
                <Select.Option value="4K">4K</Select.Option>
                <Select.Option value="4K+HDR">4K+HDR</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Страна" name="country">
          <JsonbLangInput placeholder="Узбекистан" />
        </Form.Item>

        <Divider orientation="left">Медиа</Divider>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Постер" name="posterUrl">
              <FileUpload folder="posters" accept="image/*" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Фон (backdrop)" name="backdropUrl">
              <FileUpload folder="backdrops" accept="image/*" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Трейлер" name="trailerUrl">
              <FileUpload folder="trailers" accept="video/*" presigned />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Видео (фильм)" name="videoUrl">
              <FileUpload folder="videos" accept="video/*" presigned />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="Тип видео" name="videoType" initialValue="url">
          <Select>
            <Select.Option value="url">URL (прямая ссылка)</Select.Option>
            <Select.Option value="youtube">YouTube</Select.Option>
            <Select.Option value="hls">HLS Stream</Select.Option>
            <Select.Option value="file">Файл (upload)</Select.Option>
          </Select>
        </Form.Item>

        <Divider orientation="left">Флаги</Divider>
        <Row gutter={16}>
          <Col span={6}>
            <Form.Item label="Опубликован" name="isPublished" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Premium" name="isPremium" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Hero-баннер" name="featured" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="Порядок" name="sortOrder">
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Wrapper>
  );
};

export const MovieCreate: React.FC = () => <MovieForm />;
export const MovieEdit: React.FC = () => <MovieForm isEdit />;
