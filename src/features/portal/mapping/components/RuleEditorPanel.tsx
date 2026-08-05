import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Button,
  Checkbox,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Typography,
} from 'antd'

import type {
  MappingRule,
  MappingRuleInput,
  MappingRuleType,
  RuleConflictResult,
  RulePreviewResult,
} from '../api/mappingApi'
import { RuleImpactSamples } from './RuleImpactSamples'

type Field = { name: string; required?: boolean; kind?: 'number' | 'select'; options?: string[] }
type ReferenceOption = { id: string; code?: string; name: string }
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
  productTypeGroups = [],
  internalTemplates = [],
  vendors = [],
  onDirtyChange,
  onPreview,
  onConflicts,
  onSave,
}: {
  readonly canWrite: boolean
  readonly rule?: MappingRule
  readonly type: MappingRuleType
  readonly saving?: boolean
  readonly productTypeGroups?: ReferenceOption[]
  readonly internalTemplates?: Array<ReferenceOption & { productTypeGroup?: { id: string } | null }>
  readonly vendors?: ReferenceOption[]
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
  const productTypeGroupId = Form.useWatch('productTypeGroupId', form)

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
  const referenceOptions = (name: string) => {
    const items =
      name === 'vendorId'
        ? vendors
        : name === 'internalTemplateId'
          ? internalTemplates.filter(
              (item) => !productTypeGroupId || item.productTypeGroup?.id === productTypeGroupId,
            )
          : name === 'productTypeGroupId'
            ? productTypeGroups
            : undefined
    return items?.map(({ id, code, name: label }) => ({
      value: id,
      label: code ? `${label} · ${code}` : label,
    }))
  }

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
    <div style={{ minHeight: 0, overflow: 'auto', paddingRight: 4 }}>
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
        <Row gutter={[16, 0]}>
          {displayedFields.map((field) => (
            <Col key={field.name} xs={24} md={12}>
              <Form.Item
                name={field.name}
                label={t(`mapping.fields.${field.name}`)}
                rules={field.required ? [{ required: true }] : undefined}
              >
                {referenceOptions(field.name) ? (
                  <Select
                    allowClear={!field.required}
                    showSearch
                    optionFilterProp="label"
                    options={referenceOptions(field.name)}
                  />
                ) : field.kind === 'select' ? (
                  <Select options={field.options?.map((value) => ({ value, label: value }))} />
                ) : field.kind === 'number' ? (
                  <InputNumber style={{ width: '100%' }} />
                ) : (
                  <Input />
                )}
              </Form.Item>
            </Col>
          ))}
          <Col xs={24} md={12}>
            <Form.Item name="priority" label={t('mapping.fields.priority')}>
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="status" label={t('mapping.fields.status')}>
              <Select options={['ACTIVE', 'INACTIVE'].map((value) => ({ value, label: value }))} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
      {dirty ? (
        <Typography.Text type="warning">{t('mapping.feedback.unsaved')}</Typography.Text>
      ) : null}
      {preview || conflicts ? <RuleImpactSamples conflicts={conflicts} preview={preview} /> : null}
      {hasWarning && !exactConflict ? (
        <Checkbox
          checked={acknowledged}
          onChange={(event) => setAcknowledged(event.target.checked)}
        >
          {t('mapping.actions.acknowledge')}
        </Checkbox>
      ) : null}
      <Space style={{ marginTop: 12 }}>
        <Button disabled={!canWrite} onClick={() => void inspect().catch(() => undefined)}>
          {t('mapping.actions.previewChanges')}
        </Button>
        <Button type="primary" disabled={!readyToSave} loading={saving} onClick={() => void save()}>
          {t('mapping.actions.saveRule')}
        </Button>
      </Space>
    </div>
  )
}
