import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ExperimentOutlined, SlidersOutlined, ThunderboltOutlined } from '@ant-design/icons'
import {
  Alert,
  Button,
  Checkbox,
  Col,
  Collapse,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Tag,
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
import styles from './RuleEditorPanel.module.scss'

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
    { name: 'internalTemplateId' },
    { name: 'platformProductType' },
    { name: 'productTypeAliases', kind: 'tags' },
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
    { name: 'matchType', kind: 'select', options: ['EXACT', 'CONTAINS', 'REGEX'] },
  ],
  valueAliases: [
    {
      name: 'semanticRole',
      required: true,
      kind: 'select',
      options: ['SIZE', 'COLOR', 'PRODUCT_TYPE', 'STYLE', 'MATERIAL', 'OTHER'],
    },
    { name: 'matchValues', required: true, kind: 'tags' },
    { name: 'matchType', kind: 'select', options: ['EXACT', 'CONTAINS', 'REGEX'] },
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
      : type === 'valueAliases'
        ? { status: 'ACTIVE', priority: 100, matchType: 'EXACT' }
        : type === 'semanticRules'
          ? { status: 'ACTIVE', priority: 100, matchType: 'CONTAINS' }
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

type RegexPreset = {
  key: string
  labelKey: string
  pattern: string
  normalizedValue: string
  sample?: string
  semanticRole?: string
}

const REGEX_PRESETS: RegexPreset[] = [
  {
    key: 'removeSize',
    labelKey: 'presetRemoveSize',
    pattern: '^size\\s+(.+)$',
    normalizedValue: '$1',
    sample: 'size XL',
    semanticRole: 'SIZE',
  },
  {
    key: 'removePack',
    labelKey: 'presetRemovePack',
    pattern: '^(.+)\\s*-\\s*\\d+\\s*(?:pack|packs|pcs)$',
    normalizedValue: '$1',
    sample: 'White - 2 Packs',
  },
  {
    key: 'extractInch',
    labelKey: 'presetExtractInch',
    pattern: '^(\\d+(?:\\.\\d+)?)\\s*(?:in|inch|")?$',
    normalizedValue: '$1 IN',
    sample: '8inch',
    semanticRole: 'SIZE',
  },
  {
    key: 'extractColor',
    labelKey: 'presetExtractColor',
    pattern: '.*(Black|White|Navy).*',
    normalizedValue: '$1',
    sample: 'Heather Black',
    semanticRole: 'COLOR',
  },
]

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
  const matchType = Form.useWatch('matchType', form)
  const isRegex = matchType === 'REGEX'

  const applyRegexPreset = (preset: RegexPreset) => {
    form.setFieldsValue({
      matchType: 'REGEX',
      matchValues: [preset.pattern],
      normalizedValue: preset.normalizedValue,
      ...(preset.semanticRole ? { semanticRole: preset.semanticRole } : {}),
    })
    if (preset.sample) {
      setSampleSku(preset.sample)
    }
    setDirty(true)
    onDirtyChange(true)
  }
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

  const renderField = (field: Field) => {
    const isRegexField =
      isRegex && (field.name === 'matchValues' || field.name === 'normalizedValue')
    const extraHelp = isRegexField
      ? field.name === 'matchValues'
        ? t('mapping.help.regexValuesHelp')
        : t('mapping.help.regexNormalizedHelp')
      : undefined
    const placeholder = isRegexField
      ? field.name === 'matchValues'
        ? '^size\\s+(.+)$'
        : '$1'
      : undefined

    return (
      <Col key={field.name} xs={24} md={12}>
        <Form.Item
          name={field.name}
          label={t(field.labelKey ?? `mapping.fields.${field.name}`)}
          rules={field.required ? [{ required: true }] : undefined}
          extra={extraHelp}
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
            <Select mode="tags" tokenSeparators={[',']} placeholder={placeholder} />
          ) : (
            <Input placeholder={placeholder} />
          )}
        </Form.Item>
      </Col>
    )
  }

  return (
    <div className={styles.container}>
      {!canWrite ? (
        <Alert
          type="info"
          showIcon
          message={t('mapping.states.selectContext')}
          style={{ marginBottom: 16 }}
        />
      ) : null}

      {/* Rule-type specific fields card */}
      <div className={styles.formCard}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>
            <SlidersOutlined />
            {t('mapping.sections.ruleFields', { defaultValue: 'Rule Definition' })}
          </span>
          <span className={styles.cardExtra}>{type}</span>
        </div>

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
          {isRegex && (
            <div className={styles.regexPresetsCard}>
              <div className={styles.presetsTitle}>
                <ThunderboltOutlined />
                <span>{t('mapping.help.regexPresetsTitle')}</span>
              </div>
              <div className={styles.presetsTags}>
                {REGEX_PRESETS.map((preset) => (
                  <Tag
                    key={preset.key}
                    color="blue"
                    className={styles.presetTag}
                    onClick={() => applyRegexPreset(preset)}
                  >
                    ⚡ {t(`mapping.help.${preset.labelKey}`)}
                  </Tag>
                ))}
              </div>
              <Alert
                type="info"
                showIcon
                className={styles.regexTipAlert}
                message={t('mapping.help.regexHelpTip')}
              />
            </div>
          )}
          <Row gutter={[16, 0]}>
            {displayedFields.filter((field) => !field.advanced).map(renderField)}
          </Row>
          {displayedFields.some((field) => field.advanced) ? (
            <Collapse
              ghost
              style={{ marginTop: 8 }}
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
      </div>

      {supportsSamplePreview ? (
        <div className={styles.formCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>
              <ExperimentOutlined />
              {t('mapping.sections.testSample', { defaultValue: 'Test Rule with Sample SKU' })}
            </span>
          </div>
          <Form layout="vertical">
            <div className={styles.sampleSkuRow}>
              <Form.Item
                className={styles.sampleSkuField}
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
                className={styles.previewBtn}
                disabled={!canWrite}
                onClick={() =>
                  void inspectSkuCleanup().catch((error) =>
                    setPreviewError(normalizeApiError(error).message),
                  )
                }
              >
                {t('mapping.actions.previewChanges')}
              </Button>
            </div>
          </Form>
          {previewError ? (
            <Alert type="error" showIcon message={previewError} style={{ marginTop: 12 }} />
          ) : null}
          {preview || conflicts ? (
            <div style={{ marginTop: 14 }}>
              <RuleImpactSamples conflicts={conflicts} preview={preview} />
            </div>
          ) : null}
        </div>
      ) : null}

      {!supportsSamplePreview && previewError ? (
        <Alert type="error" showIcon message={previewError} style={{ marginBottom: 12 }} />
      ) : null}
      {!supportsSamplePreview && (preview || conflicts) ? (
        <RuleImpactSamples conflicts={conflicts} preview={preview} />
      ) : null}

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
      <div className={styles.actionBar}>
        <div>
          {dirty ? (
            <Typography.Text type="warning" style={{ fontSize: 12 }}>
              ● {t('mapping.feedback.unsaved')}
            </Typography.Text>
          ) : null}
        </div>
        <Button
          disabled={!canWrite}
          type="primary"
          loading={saving}
          className={styles.saveBtn}
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
