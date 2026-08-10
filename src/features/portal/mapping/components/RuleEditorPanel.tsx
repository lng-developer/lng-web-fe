import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Button,
  Checkbox,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Switch,
  Typography,
} from 'antd'

import { normalizeApiError } from '@/shared/api'

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
    {
      name: 'patternType',
      required: true,
      kind: 'select',
      options: ['SEGMENT'],
    },
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
const fieldNamesByType = Object.fromEntries(
  Object.entries(fields).map(([type, items]) => [type, new Set(items.map((field) => field.name))]),
) as Record<MappingRuleType, Set<string>>
const metadataFieldNames = new Set([
  'shopId',
  'salesChannelCode',
  'marketplaceCode',
  'status',
  'priority',
])
const csvListFields = new Set(['appliesWhenValues', 'productTypeAliases'])
const scopeFieldNames = ['shopId', 'salesChannelCode', 'marketplaceCode'] as const

function scopeValues(rule?: MappingRule) {
  return Object.fromEntries(
    scopeFieldNames.flatMap((key) => (rule?.[key] ? [[key, rule[key]]] : [])),
  )
}

function pickRuleValues(type: MappingRuleType, values: MappingRuleInput) {
  const allowedFields = fieldNamesByType[type]
  return Object.fromEntries(
    Object.entries(values).filter(([key]) => {
      if (metadataFieldNames.has(key)) return true
      return allowedFields.has(key)
    }),
  )
}

function normalizeValues(type: MappingRuleType, values: MappingRuleInput) {
  const filtered = pickRuleValues(type, values)
  return Object.fromEntries(
    Object.entries(filtered).flatMap(([key, value]) => {
      if (value === '' || value == null || key === 'id') return []
      if (csvListFields.has(key)) {
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

function initialValues(type: MappingRuleType, rule?: MappingRule): MappingRuleInput {
  const baseDefaults =
    type === 'skuNormalize'
      ? { status: 'ACTIVE', priority: 100, patternType: 'SEGMENT' }
      : { status: 'ACTIVE', priority: 100 }
  const values = rule ? { ...baseDefaults, ...rule } : baseDefaults
  return normalizeValues(type, values)
}

export function RuleEditorPanel({
  canWrite,
  rule,
  type,
  saving,
  productTypeGroups = [],
  internalTemplates = [],
  vendors = [],
  initialSampleSku = '',
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
  readonly initialSampleSku?: string
  readonly onDirtyChange: (dirty: boolean) => void
  readonly onPreview: (rule: MappingRuleInput, samples: string[]) => Promise<RulePreviewResult>
  readonly onConflicts: (rule: MappingRuleInput) => Promise<RuleConflictResult>
  readonly onSave: (rule: MappingRuleInput) => Promise<void>
}) {
  const { t } = useTranslation()
  const [form] = Form.useForm<MappingRuleInput>()
  const [preview, setPreview] = useState<RulePreviewResult>()
  const [conflicts, setConflicts] = useState<RuleConflictResult>()
  const [acknowledged, setAcknowledged] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [sampleSku, setSampleSku] = useState(initialSampleSku)
  const [previewError, setPreviewError] = useState<string>()
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

  const rulePayload = async () => ({
    ...initialValues(type, rule),
    ...scopeValues(rule),
    ...normalizeValues(type, await form.validateFields()),
  })

  const inspect = async () => {
    setPreviewError(undefined)
    const values = await rulePayload()
    const sample = sampleSku.trim()
    const nextPreview = await onPreview(values, sample ? [sample] : [])
    setPreview(nextPreview)
    setConflicts(await onConflicts(values))
    setAcknowledged(false)
  }

  const save = async () => {
    if (!readyToSave) return
    await onSave(await rulePayload())
    setPreview(undefined)
    setConflicts(undefined)
    setAcknowledged(false)
    setDirty(false)
    onDirtyChange(false)
  }

  return (
    <div style={{ minHeight: 0, overflow: 'auto', paddingRight: 4 }}>
      {!canWrite ? (
        <Alert
          type="info"
          showIcon
          message={t('mapping.states.selectContext')}
          style={{ marginBottom: 16 }}
        />
      ) : null}

      <Form
        form={form}
        disabled={!canWrite}
        layout="vertical"
        initialValues={initialValues(type, rule)}
        onValuesChange={() => {
          setDirty(true)
          setPreview(undefined)
          setConflicts(undefined)
          onDirtyChange(true)
        }}
      >
        {/* Rule-type specific fields */}
        <Divider plain style={{ fontSize: 12, margin: '0 0 16px' }}>
          {t('mapping.sections.ruleFields', { defaultValue: 'Rule Definition' })}
        </Divider>
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
        </Row>

        {/* Metadata */}
        <Divider plain style={{ fontSize: 12, margin: '8px 0 16px' }}>
          {t('mapping.sections.ruleMetadata', { defaultValue: 'Priority & Status' })}
        </Divider>
        <Row gutter={[16, 0]} align="middle">
          <Col xs={24} md={12}>
            <Form.Item name="priority" label={t('mapping.fields.priority')}>
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="status"
              label={t('mapping.fields.status')}
              valuePropName="checked"
              getValueFromEvent={(checked: boolean) => (checked ? 'ACTIVE' : 'INACTIVE')}
              getValueProps={(v) => ({ checked: v === 'ACTIVE' })}
            >
              <Switch
                checkedChildren={t('mapping.states.active')}
                unCheckedChildren={t('mapping.states.inactive')}
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>

      {/* Unsaved indicator */}
      {dirty ? (
        <Typography.Text type="warning" style={{ fontSize: 12 }}>
          ● {t('mapping.feedback.unsaved')}
        </Typography.Text>
      ) : null}

      {/* Impact preview */}
      <Form.Item label={t('mapping.fields.sampleSku')} htmlFor="mapping-rule-sample-sku">
        <Input
          id="mapping-rule-sample-sku"
          value={sampleSku}
          onChange={(event) => setSampleSku(event.target.value)}
        />
      </Form.Item>
      {previewError ? <Alert type="error" showIcon message={previewError} /> : null}
      {preview || conflicts ? <RuleImpactSamples conflicts={conflicts} preview={preview} /> : null}

      {/* Conflict ack */}
      {hasWarning && !exactConflict ? (
        <Checkbox
          checked={acknowledged}
          onChange={(event) => setAcknowledged(event.target.checked)}
          style={{ marginTop: 8 }}
        >
          {t('mapping.actions.acknowledge')}
        </Checkbox>
      ) : null}

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          marginTop: 20,
          paddingTop: 16,
          borderTop: '1px solid var(--ant-color-border)',
        }}
      >
        <Button
          disabled={!canWrite}
          onClick={() =>
            void inspect().catch((error) => setPreviewError(normalizeApiError(error).message))
          }
        >
          {t('mapping.actions.previewChanges')}
        </Button>
        <Button type="primary" disabled={!readyToSave} loading={saving} onClick={() => void save()}>
          {t('mapping.actions.saveRule')}
        </Button>
      </div>
    </div>
  )
}
