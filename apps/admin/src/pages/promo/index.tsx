import React, { useState, useEffect } from 'react';
import { List, Create, Edit, useTable, useForm } from '@refinedev/antd';
import {
  Table, Form, Input, InputNumber, Select, Switch, DatePicker,
  Space, Tag, Button, Modal, Typography, Card, Descriptions, Spin,
} from 'antd';
import { EditButton, DeleteButton } from '@refinedev/antd';
import { CopyOutlined, BarChartOutlined } from '@ant-design/icons';
import { getAdminSecret } from '../../providers/dataProvider';

const { Text } = Typography;

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'MK-';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

const planLabels: Record<string, string> = {
  basic: 'Базовый',
  standard: 'Стандарт',
  premium: 'Premium',
};

export const PromoList: React.FC = () => {
  const { tableProps } = useTable({
    resource: 'promo',
    sorters: { initial: [{ field: 'createdAt', order: 'desc' }] },
  });

  const [statsModal, setStatsModal] = useState<{ open: boolean; id: string; code: string }>({
    open: false, id: '', code: '',
  });

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column title="Код" dataIndex="code" render={(v: string) => (
          <Text copyable={{ text: v }} code style={{ fontSize: 14, fontWeight: 700 }}>{v}</Text>
        )} />
        <Table.Column title="Тариф" dataIndex="planSlug" render={(v: string) => (
          <Tag color={v === 'premium' ? 'gold' : v === 'standard' ? 'blue' : 'default'}>
            {planLabels[v] || v}
          </Tag>
        )} />
        <Table.Column title="Дней" dataIndex="durationDays" width={80} />
        <Table.Column title="Использований" render={(_: any, r: any) => (
          <span>{r.currentUses || 0}{r.maxUses ? ` / ${r.maxUses}` : ' / ∞'}</span>
        )} />
        <Table.Column title="Статус" dataIndex="isActive" width={100} render={(v: boolean) => (
          <Tag color={v ? 'green' : 'red'}>{v ? 'Активен' : 'Неактивен'}</Tag>
        )} />
        <Table.Column title="Истекает" dataIndex="expiresAt" render={(v: string) => (
          v ? new Date(v).toLocaleDateString('ru-RU') : '—'
        )} />
        <Table.Column title="Создан" dataIndex="createdAt" render={(v: string) => (
          v ? new Date(v).toLocaleDateString('ru-RU') : ''
        )} />
        <Table.Column title="" width={150} render={(_: any, r: any) => (
          <Space>
            <Button
              size="small"
              icon={<BarChartOutlined />}
              onClick={() => setStatsModal({ open: true, id: r.id, code: r.code })}
            />
            <EditButton hideText size="small" recordItemId={r.id} />
            <DeleteButton hideText size="small" recordItemId={r.id} />
          </Space>
        )} />
      </Table>

      <PromoStatsModal
        open={statsModal.open}
        promoId={statsModal.id}
        promoCode={statsModal.code}
        onClose={() => setStatsModal({ open: false, id: '', code: '' })}
      />
    </List>
  );
};

const API_URL = (import.meta.env.VITE_API_URL || '') + '/admin';

const PromoStatsModal: React.FC<{
  open: boolean;
  promoId: string;
  promoCode: string;
  onClose: () => void;
}> = ({ open, promoId, promoCode, onClose }) => {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open || !promoId) return;
    setIsLoading(true);
    fetch(`${API_URL}/promo/${promoId}/stats`, {
      headers: { 'X-Admin-Secret': getAdminSecret() },
    })
      .then(r => r.json())
      .then(data => setStats(data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [open, promoId]);

  return (
    <Modal
      title={`Статистика: ${promoCode}`}
      open={open}
      onCancel={onClose}
      footer={null}
      width={640}
    >
      {stats?.promoCode && (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Descriptions column={2} size="small">
            <Descriptions.Item label="Тариф">
              {planLabels[stats.promoCode.planSlug] || stats.promoCode.planSlug}
            </Descriptions.Item>
            <Descriptions.Item label="Дней">{stats.promoCode.durationDays}</Descriptions.Item>
            <Descriptions.Item label="Использований">
              {stats.promoCode.currentUses || 0}{stats.promoCode.maxUses ? ` / ${stats.promoCode.maxUses}` : ' / ∞'}
            </Descriptions.Item>
            <Descriptions.Item label="Статус">
              <Tag color={stats.promoCode.isActive ? 'green' : 'red'}>
                {stats.promoCode.isActive ? 'Активен' : 'Неактивен'}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      <Table
        dataSource={stats?.usages || []}
        rowKey="id"
        loading={isLoading}
        size="small"
        pagination={{ pageSize: 10 }}
      >
        <Table.Column title="Пользователь" render={(_: any, r: any) => (
          <div>
            <div>{r.userEmail || '—'}</div>
            {r.userName && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {typeof r.userName === 'object' ? r.userName.ru : r.userName}
              </Text>
            )}
          </div>
        )} />
        <Table.Column title="Тариф" dataIndex="planGranted" render={(v: string) => (
          <Tag>{planLabels[v] || v}</Tag>
        )} />
        <Table.Column title="Дней" dataIndex="daysGranted" width={80} />
        <Table.Column title="Дата" dataIndex="appliedAt" render={(v: string) => (
          v ? new Date(v).toLocaleString('ru-RU') : ''
        )} />
      </Table>
    </Modal>
  );
};

const PromoForm: React.FC<{ isEdit?: boolean }> = ({ isEdit }) => {
  const { formProps, saveButtonProps } = useForm({ resource: 'promo' });
  const Wrapper = isEdit ? Edit : Create;

  return (
    <Wrapper saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item label="Код промокода" name="code" rules={[{ required: true, message: 'Введите код' }]}>
          <Input
            placeholder="PREMIUM30"
            style={{ textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 700 }}
            addonAfter={
              !isEdit ? (
                <Button
                  size="small"
                  type="text"
                  icon={<CopyOutlined />}
                  onClick={() => {
                    const code = generateCode();
                    formProps.form?.setFieldValue('code', code);
                  }}
                >
                  Сгенерировать
                </Button>
              ) : undefined
            }
          />
        </Form.Item>

        <Form.Item label="Тариф" name="planSlug" rules={[{ required: true }]} initialValue="premium">
          <Select>
            <Select.Option value="basic">Базовый</Select.Option>
            <Select.Option value="standard">Стандарт</Select.Option>
            <Select.Option value="premium">Premium</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item label="Длительность (дней)" name="durationDays" rules={[{ required: true }]} initialValue={30}>
          <InputNumber min={1} max={3650} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item label="Макс. использований" name="maxUses" extra="Оставьте пустым для безлимита">
          <InputNumber min={1} style={{ width: '100%' }} placeholder="Безлимитно" />
        </Form.Item>

        <Form.Item label="Дата истечения" name="expiresAt" extra="Оставьте пустым для бессрочного">
          <Input type="datetime-local" />
        </Form.Item>

        <Form.Item label="Активен" name="isActive" valuePropName="checked" initialValue={true}>
          <Switch />
        </Form.Item>
      </Form>
    </Wrapper>
  );
};

export const PromoCreate: React.FC = () => <PromoForm />;
export const PromoEdit: React.FC = () => <PromoForm isEdit />;
