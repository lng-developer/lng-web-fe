import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Button, Checkbox, Form, Input, InputNumber, Select, Space, Typography } from 'antd'

import type {
  MappingRule,
  MappingRuleInput,
  MappingRuleType,
  RuleConflictResult,
  RulePreviewResult,
} from '../api/mappingApi'
import { RuleImpactSamples } from './RuleImpactSamples'

type Field = { name: string; required?: boolean; kind?: 'number' | 'select'; options?: string[] }
const fields: Record<MappingRuleType, Field[]> = {
  skuNormalize: [
    { name: 'configCode' },
    { name: 'segmentIndex', required: true, kind: 'number' },
    {
      name: 'segmentRole',
      required: true,
      kind: 'select',
      options: ['EMPLOYEE', 'SIZE', 'COLOR', 'CONFIG', 'COUNTRY', 'OTHER'],
    },
    { name: 'appliesWhenValues', required: true },
    {
      name: 'outputAction',
      required: true,
      kind: 'select',
      options: ['REMOVE_SEGMENT', 'REPLACE_SEGMENT'],
    },
    { name: 'replacementValue' },
  ],
  skuConfig: [
    { name: 'configCode', required: true },
    { name: 'platformProductType' },
    { name: 'productTypeAliases' },
    { name: 'countryCode' },
    { name: 'productTypeGroupId', required: true },
    { name: 'internalTemplateId' },
  ],
  semanticRules: [
    {
      name: 'semanticRole',
      required: true,
      kind: 'select',
      options: [
        'SIZE',
        'COLOR',
        'PRODUCT_TYPE',
        'STYLE',
        'MATERIAL',
        'CUSTOM_TEXT',
        'CUSTOMER_IMAGE',
        'OTHER',
      ],
    },
    { name: 'matchValue', required: true },
    { name: 'matchType', required: true, kind: 'select', options: ['EXACT', 'CONTAINS'] },
    { name: 'productTypeGroupId' },
  ],
  valueAliases: [
    {
      name: 'semanticRole',
      required: true,
      kind: 'select',
      options: ['SIZE', 'COLOR', 'PRODUCT_TYPE', 'STYLE', 'MATERIAL', 'OTHER'],
    },
    { name: 'matchValue', required: true },
    { name: 'normalizedValue', required: true },
    { name: 'matchType', required: true, kind: 'select', options: ['EXACT', 'CONTAINS'] },
  ],
  vendorRouting: [
    { name: 'productTypeGroupId', required: true },
    { name: 'vendorId', required: true },
    { name: 'asin' },
    { name: 'configCode' },
    { name: 'normalizedSize' },
    { name: 'normalizedColor' },
  ],
}

function initialValues(rule?: MappingRule): MappingRuleInput {
  return rule ? { ...rule } : { status: 'ACTIVE', priority: 100, matchType: 'EXACT' }
}

function normalizeValues(values: MappingRuleInput) {
  return Object.fromEntries(
    Object.entries(values).flatMap(([key, value]) => {
      if (value === '' || value == null || key === 'id') return []
      if (key === 'appliesWhenValues' || key === 'productTypeAliases') {
        return [
          [
            key,
            String(value)
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean),
          ],
        ]
      }
      return [[key, value]]
    }),
  )
}

export function RuleEditorPanel({
  canWrite,
  rule,
  type,
  saving,
  onDirtyChange,
  onPreview,
  onConflicts,
  onSave,
}: {
  readonly canWrite: boolean
  readonly rule?: MappingRule
  readonly type: MappingRuleType
  readonly saving?: boolean
  readonly onDirtyChange: (dirty: boolean) => void
  readonly onPreview: (rule: MappingRuleInput) => Promise<RulePreviewResult>
  readonly onConflicts: (rule: MappingRuleInput) => Promise<RuleConflictResult>
  readonly onSave: (rule: MappingRuleInput) => Promise<void>
}) {
  const { t } = useTranslation()
  const [form] = Form.useForm<MappingRuleInput>()
  const [preview, setPreview] = useState<RulePreviewResult>()
  const [conflicts, setConflicts] = useState<RuleConflictResult>()
  const [acknowledged, setAcknowledged] = useState(false)
  const [dirty, setDirty] = useState(false)

  const exactConflict = Boolean(
    conflicts?.hasExactConflict ||
    conflicts?.errors?.length ||
    conflicts?.conflicts?.some((item) => item.severity === 'ERROR'),
  )
  const hasWarning = Boolean(
    conflicts?.warnings?.length ||
    conflicts?.conflicts?.some((item) => item.severity === 'WARNING'),
  )
  const readyToSave = Boolean(
    preview && conflicts && !exactConflict && (!hasWarning || acknowledged),
  )
  const displayedFields = useMemo(() => fields[type], [type])

  const inspect = async () => {
    const values = normalizeValues(await form.validateFields())
    const nextPreview = await onPreview(values)
    setPreview(nextPreview)
    setConflicts(await onConflicts(values))
    setAcknowledged(false)
  }

  const save = async () => {
    if (!readyToSave) return
    await onSave(normalizeValues(await form.validateFields()))
    setPreview(undefined)
    setConflicts(undefined)
    setAcknowledged(false)
    setDirty(false)
    onDirtyChange(false)
  }

  return (
    <div className="min-h-0 overflow-auto pr-1">
      {!canWrite ? (
        <Alert type="info" showIcon message={t('mapping.states.selectContext')} />
      ) : null}
      <Form
        form={form}
        disabled={!canWrite}
        layout="vertical"
        initialValues={initialValues(rule)}
        onValuesChange={() => {
          setDirty(true)
          setPreview(undefined)
          setConflicts(undefined)
          onDirtyChange(true)
        }}
      >
        <div className="grid grid-cols-2 gap-x-3">
          {displayedFields.map((field) => (
            <Form.Item
              key={field.name}
              name={field.name}
              label={t(`mapping.fields.${field.name}`)}
              rules={field.required ? [{ required: true }] : undefined}
            >
              {field.kind === 'select' ? (
                <Select options={field.options?.map((value) => ({ value, label: value }))} />
              ) : field.kind === 'number' ? (
                <InputNumber className="w-full" />
              ) : (
                <Input />
              )}
            </Form.Item>
          ))}
          <Form.Item name="priority" label={t('mapping.fields.priority')}>
            <InputNumber className="w-full" min={0} />
          </Form.Item>
          <Form.Item name="status" label={t('mapping.fields.status')}>
            <Select options={['ACTIVE', 'INACTIVE'].map((value) => ({ value, label: value }))} />
          </Form.Item>
        </div>
      </Form>
      {dirty ? (
        <Typography.Text type="warning">{t('mapping.feedback.unsaved')}</Typography.Text>
      ) : null}
      <RuleImpactSamples conflicts={conflicts} preview={preview} />
      {hasWarning && !exactConflict ? (
        <Checkbox
          checked={acknowledged}
          onChange={(event) => setAcknowledged(event.target.checked)}
        >
          {t('mapping.actions.acknowledge')}
        </Checkbox>
      ) : null}
      <Space className="mt-3">
        <Button disabled={!canWrite} onClick={() => void inspect()}>
          {t('mapping.actions.previewChanges')}
        </Button>
        <Button type="primary" disabled={!readyToSave} loading={saving} onClick={() => void save()}>
          {t('mapping.actions.saveRule')}
        </Button>
      </Space>
    </div>
  )
}
