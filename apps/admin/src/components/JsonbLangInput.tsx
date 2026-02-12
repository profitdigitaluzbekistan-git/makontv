/**
 * JsonbLangInput — input component for JSONB i18n fields.
 * Shows two inputs: one for Russian, one for Uzbek.
 * Value: { ru: "...", uz: "..." }
 */
import React from 'react';
import { Input, Space, Typography } from 'antd';

const { Text } = Typography;

interface Props {
  value?: { ru?: string; uz?: string };
  onChange?: (value: { ru: string; uz: string }) => void;
  textarea?: boolean;
  placeholder?: string;
}

export const JsonbLangInput: React.FC<Props> = ({
  value = { ru: '', uz: '' },
  onChange,
  textarea = false,
  placeholder = '',
}) => {
  const handleChange = (lang: 'ru' | 'uz', text: string) => {
    onChange?.({
      ru: lang === 'ru' ? text : (value?.ru || ''),
      uz: lang === 'uz' ? text : (value?.uz || ''),
    });
  };

  const InputComponent = textarea ? Input.TextArea : Input;

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <div>
        <Text type="secondary" style={{ fontSize: 12 }}>🇷🇺 Русский</Text>
        <InputComponent
          value={value?.ru || ''}
          onChange={(e) => handleChange('ru', e.target.value)}
          placeholder={`${placeholder} (RU)`}
          rows={textarea ? 3 : undefined}
        />
      </div>
      <div>
        <Text type="secondary" style={{ fontSize: 12 }}>🇺🇿 O'zbek</Text>
        <InputComponent
          value={value?.uz || ''}
          onChange={(e) => handleChange('uz', e.target.value)}
          placeholder={`${placeholder} (UZ)`}
          rows={textarea ? 3 : undefined}
        />
      </div>
    </Space>
  );
};

/**
 * Display a JSONB i18n value (e.g. in table column).
 */
export const JsonbLangDisplay: React.FC<{ value: any }> = ({ value }) => {
  if (!value) return <Text type="secondary">—</Text>;
  if (typeof value === 'string') return <>{value}</>;
  return (
    <Space direction="vertical" size={0}>
      <Text>{value.ru || '—'}</Text>
      <Text type="secondary" style={{ fontSize: 12 }}>{value.uz || ''}</Text>
    </Space>
  );
};
