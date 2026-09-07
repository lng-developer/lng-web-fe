import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Button,
  Checkbox,
  Col,
  Collapse,
  Divider,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
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

type Field = {
  name: string
  labelKey?: string
  required?: boolean
  kind?: 'number' | 'select' | 'tags'
  options?: string[]
  advanced?: boolean
  visibleWhen?: { name: string; value: string }
}
type ReferenceOption = { id: string; code?: string; name: string }
const fields: Record<MappingRuleType, Field[]> = {
  skuNormalize: [
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
    { name: 'replacementValue', visibleWhen: { name: 'outputAction', value: 'REPLACE_SEGMENT' } },
  ],
  skuConfig: [
    { name: 'configCode', required: true },
    { name: 'productTypeGroupId', required: true },
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
        'PRODUCT_TYPE_COLOR',
        'PRODUCT_TYPE_SIZE',
        'STYLE',
        'MATERIAL',
        'CUSTOM_TEXT',
        'CUSTOMER_IMAGE',
        'OTHER',
      ],
    },
    {
      name: 'matchValues',
      labelKey: 'mapping.fields.optionLabelAliases',
      required: true,
      kind: 'tags',
    },
    { name: 'matchType', kind: 'select', options: ['EXACT', 'CONTAINS'] },
  ],
  valueAliases: [
    {
      name: 'semanticRole',
      required: true,
      kind: 'select',
      options: ['SIZE', 'COLOR', 'PRODUCT_TYPE', 'STYLE', 'MATERIAL', 'OTHER'],
    },
    { name: 'matchValues', required: true, kind: 'tags' },
    { name: 'normalizedValue', required: true },
  ],
  vendorRouting: [
    { name: 'productTypeGroupId', required: true },
    { name: 'vendorId', required: true },
    { name: 'asin', advanced: true },
    { name: 'configCode', advanced: true },
    { name: 'normalizedSize', advanced: true },
    { name: 'normalizedColor', advanced: true },
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
const csvListFields = new Set([
  'appliesWhenValues',
  'productTypeAliases',
  'productTypeColorKeys',
  'productTypeSizeKeys',
  'sizeKeys',
])
const scopeFieldNames = ['shopId', 'salesChannelCode', 'marketplaceCode'] as const

function semanticSamplePlaceholder(semanticRole: unknown) {
  if (semanticRole === 'SIZE') return 'Example: Select Size'
  if (semanticRole === 'COLOR') return 'Example: Select Color'
  if (semanticRole === 'PRODUCT_TYPE') return 'Example: Select Product Type'
  if (semanticRole === 'PRODUCT_TYPE_COLOR') return 'Example: Select Product Type & Color'
  if (semanticRole === 'PRODUCT_TYPE_SIZE') return 'Example: Select Product Type & Size'
  return undefined
}

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
  const values: MappingRuleInput = rule ? { ...baseDefaults, ...rule } : baseDefaults
  if (
    ['semanticRules', 'valueAliases'].includes(type) &&
    !values.matchValues &&
    values.matchValue
  ) {
    values.matchValues = [values.matchValue]
  }
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
  const [sampleSku, setSampleSku] = useState('')
  const [previewError, setPreviewError] = useState<string>()
  const productTypeGroupId = Form.useWatch('productTypeGroupId', form)
  const outputAction = Form.useWatch('outputAction', form)
  const semanticRole = Form.useWatch('semanticRole', form)
  const supportsSamplePreview = [
    'skuNormalize',
    'skuConfig',
    'semanticRules',
    'valueAliases',
  ].includes(type)

  const exactConflict = Boolean(
    conflicts?.hasExactConflict ||
    conflicts?.errors?.length ||
    conflicts?.conflicts?.some((item) => item.severity === 'ERROR'),
  )
  const hasWarning = Boolean(
    conflicts?.warnings?.length ||
    conflicts?.conflicts?.some((item) => item.severity === 'WARNING'),
  )
  const displayedFields = useMemo(
    () =>
      fields[type].filter(
        (field) => !field.visibleWhen || outputAction === field.visibleWhen.value,
      ),
    [outputAction, type],
  )
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

  const save = async () => {
    setPreviewError(undefined)
    const values = await rulePayload()
    const [nextPreview, nextConflicts] = await Promise.all([
      onPreview(values, []),
      onConflicts(values),
    ])
    setPreview(nextPreview)
    setConflicts(nextConflicts)
    const hasExactConflict = Boolean(
      nextConflicts.hasExactConflict ||
      nextConflicts.errors?.length ||
      nextConflicts.conflicts?.some((item) => item.severity === 'ERROR'),
    )
    const hasWarning = Boolean(
      nextConflicts.warnings?.length ||
      nextConflicts.conflicts?.some((item) => item.severity === 'WARNING'),
    )
    if (hasExactConflict || (hasWarning && !acknowledged)) return
    await onSave(values)
    setPreview(undefined)
    setConflicts(undefined)
    setAcknowledged(false)
    setDirty(false)
    onDirtyChange(false)
  }

  const inspectSkuCleanup = async () => {
    setPreviewError(undefined)
    const values = await rulePayload()
    const sample = (sampleSku || initialSampleSku).trim()
    const [nextPreview, nextConflicts] = await Promise.all([
      onPreview(values, sample ? [sample] : []),
      onConflicts(values),
    ])
    setPreview(nextPreview)
    setConflicts(nextConflicts)
    setAcknowledged(false)
  }

  const renderField = (field: Field) => (
    <Col key={field.name} xs={24} md={12}>
      <Form.Item
        name={field.name}
        label={t(field.labelKey ?? `mapping.fields.${field.name}`)}
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
        ) : field.kind === 'tags' ? (
          <Select mode="tags" tokenSeparators={[',']} />
        ) : (
          <Input />
        )}
      </Form.Item>
    </Col>
  )

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
          setAcknowledged(false)
          onDirtyChange(true)
        }}
      >
        {/* Rule-type specific fields */}
        <Divider plain style={{ fontSize: 12, margin: '0 0 16px' }}>
          {t('mapping.sections.ruleFields', { defaultValue: 'Rule Definition' })}
        </Divider>
        <Row gutter={[16, 0]}>
          {displayedFields.filter((field) => !field.advanced).map(renderField)}
        </Row>
        {displayedFields.some((field) => field.advanced) ? (
          <Collapse
            ghost
            items={[
              {
                key: 'conditions',
                label: t('mapping.sections.additionalConditions'),
                children: (
                  <Row gutter={[16, 0]}>
                    {displayedFields.filter((field) => field.advanced).map(renderField)}
                  </Row>
                ),
              },
            ]}
          />
        ) : null}
      </Form>

      {/* Unsaved indicator */}
      {dirty ? (
        <Typography.Text type="warning" style={{ fontSize: 12 }}>
          ● {t('mapping.feedback.unsaved')}
        </Typography.Text>
      ) : null}

      {supportsSamplePreview ? (
        <>
          <Form.Item
            label={t(
              type === 'semanticRules'
                ? 'mapping.fields.sampleLabel'
                : `mapping.fields.${type === 'skuNormalize' ? 'sampleSku' : 'sampleValue'}`,
            )}
            htmlFor="mapping-rule-sample-sku"
            extra={type === 'semanticRules' ? t('mapping.help.semanticSampleLabel') : undefined}
          >
            <Input
              id="mapping-rule-sample-sku"
              value={sampleSku || initialSampleSku}
              placeholder={
                type === 'semanticRules' ? semanticSamplePlaceholder(semanticRole) : undefined
              }
              onChange={(event) => setSampleSku(event.target.value)}
            />
          </Form.Item>
          <Button
            disabled={!canWrite}
            onClick={() =>
              void inspectSkuCleanup().catch((error) =>
                setPreviewError(normalizeApiError(error).message),
              )
            }
          >
            {t('mapping.actions.previewChanges')}
          </Button>
        </>
      ) : null}
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
          type="primary"
          loading={saving}
          onClick={() =>
            void save().catch((error) => setPreviewError(normalizeApiError(error).message))
          }
        >
          {t('mapping.actions.saveRule')}
        </Button>
      </div>
    </div>
  )
}
