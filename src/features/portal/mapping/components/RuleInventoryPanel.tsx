import { type ReactNode, useDeferredValue, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { EditOutlined, HistoryOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Flex, Select, Space, Switch, Table, Tooltip, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

import { SearchInput } from '@/shared/ui'

import type { MappingRule, MappingRuleType } from '../api/mappingApi'

dayjs.extend(relativeTime)

export type RuleReferenceLabels = {
  productGroups?: Record<string, string>
  templates?: Record<string, string>
  vendors?: Record<string, string>
}

const emptyReferences: RuleReferenceLabels = {}

const ruleFields: Record<MappingRuleType, string[]> = {
  skuNormalize: ['segmentIndex', 'segmentRole', 'appliesWhenValues', 'outputAction'],
  skuConfig: ['configCode', 'platformProductType', 'productTypeGroupId', 'internalTemplateId'],
  semanticRules: ['semanticRole', 'matchValue', 'matchType', 'productTypeGroupId'],
  valueAliases: ['semanticRole', 'matchValue', 'normalizedValue', 'matchType'],
  vendorRouting: ['productTypeGroupId', 'vendorId', 'normalizedSize', 'normalizedColor'],
}

function displayValue(
  rule: MappingRule,
  field: string,
  refs: RuleReferenceLabels,
  fallback: string,
) {
  const value = rule[field]
  if (field === 'productTypeGroupId') return refs.productGroups?.[String(value)] ?? fallback
  if (field === 'internalTemplateId') return refs.templates?.[String(value)] ?? fallback
  if (field === 'vendorId') return refs.vendors?.[String(value)] ?? fallback
  if (Array.isArray(value)) return value.join(', ') || fallback
  return value == null || value === '' ? fallback : String(value)
}

export function RuleInventoryPanel({
  canWrite,
  shopFilter,
  loading,
  references,
  rules,
  search,
  status,
  type,
  onCreate,
  onHistory,
  onSearchChange,
  onSelect,
  onStatusChange,
  onToggleStatus,
}: {
  readonly canWrite: boolean
  readonly shopFilter?: ReactNode
  readonly loading?: boolean
  readonly references?: RuleReferenceLabels
  readonly rules: MappingRule[]
  readonly search: string
  readonly status?: 'ACTIVE' | 'INACTIVE'
  readonly type: MappingRuleType
  readonly onCreate: () => void
  readonly onHistory: (rule: MappingRule) => void
  readonly onSearchChange: (value: string) => void
  readonly onSelect: (rule: MappingRule) => void
  readonly onStatusChange: (value?: 'ACTIVE' | 'INACTIVE') => void
  readonly onToggleStatus: (rule: MappingRule) => void
}) {
  const { t } = useTranslation()
  const refs = references ?? emptyReferences
  const fallback = t('mapping.states.unavailable')
  const deferredSearch = useDeferredValue(search)

  const filtered = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase()
    return rules.filter(
      (rule) =>
        (!status || rule.status === status) &&
        (!query ||
          ruleFields[type]
            .map((field) => displayValue(rule, field, refs, fallback))
            .join(' ')
            .toLowerCase()
            .includes(query)),
    )
  }, [fallback, refs, rules, deferredSearch, status, type])

  const columns = useMemo<ColumnsType<MappingRule>>(
    () => [
      // Priority column
      {
        key: 'priority',
        title: '#',
        width: 56,
        align: 'center' as const,
        render: (_: unknown, rule) => (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {rule.priority ?? '—'}
          </Typography.Text>
        ),
      },
      // Dynamic fields
      ...ruleFields[type].map((field) => ({
        key: field,
        title: t(`mapping.fields.${field}`),
        ellipsis: true,
        render: (_: unknown, rule: MappingRule) => {
          const val = displayValue(rule, field, refs, fallback)
          return (
            <Tooltip title={val !== fallback ? val : undefined} placement="topLeft">
              <span style={{ fontSize: 13 }}>{val}</span>
            </Tooltip>
          )
        },
      })),
      // Status — inline Switch
      {
        key: 'status',
        title: t('mapping.fields.status'),
        width: 90,
        render: (_: unknown, rule) => (
          <Switch
            size="small"
            checked={rule.status === 'ACTIVE'}
            disabled={!canWrite}
            onChange={() => onToggleStatus(rule)}
            onClick={(_, e) => e.stopPropagation()}
            checkedChildren="ON"
            unCheckedChildren="OFF"
          />
        ),
      },
      // Updated At
      {
        key: 'updatedAt',
        title: t('mapping.fields.updatedAt'),
        width: 110,
        render: (_: unknown, rule) =>
          rule.updatedAt ? (
            <Tooltip title={new Date(rule.updatedAt).toLocaleString()}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {dayjs(rule.updatedAt).fromNow()}
              </Typography.Text>
            </Tooltip>
          ) : (
            fallback
          ),
      },
      // Actions
      {
        key: 'actions',
        title: '',
        width: 80,
        render: (_: unknown, rule) => (
          <Space size={0} onClick={(event) => event.stopPropagation()}>
            <Tooltip title={t('mapping.actions.edit')}>
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => onSelect(rule)}
              />
            </Tooltip>
            <Tooltip title={t('mapping.actions.history')}>
              <Button
                type="text"
                size="small"
                icon={<HistoryOutlined />}
                aria-label={t('mapping.actions.history')}
                onClick={() => onHistory(rule)}
              />
            </Tooltip>
          </Space>
        ),
      },
    ],
    [canWrite, fallback, onHistory, onSelect, onToggleStatus, refs, t, type],
  )

  return (
    <Flex vertical gap={12} style={{ minHeight: 0 }}>
      {/* Filter bar */}
      <Flex gap={10} wrap="wrap" align="center">
        {shopFilter ? <div style={{ flex: '0 0 200px' }}>{shopFilter}</div> : null}
        <div style={{ flex: '1 1 280px', minWidth: 0 }}>
          <SearchInput
            aria-label={t('mapping.filters.searchRules')}
            placeholder={t('mapping.filters.searchRules')}
            value={search}
            onSearchChange={onSearchChange}
          />
        </div>
        <Select
          allowClear
          size="middle"
          aria-label={t('mapping.filters.status')}
          style={{ width: 140 }}
          placeholder={t('mapping.filters.status')}
          value={status}
          options={[
            { value: 'ACTIVE', label: t('mapping.states.active') },
            { value: 'INACTIVE', label: t('mapping.states.inactive') },
          ]}
          onChange={onStatusChange}
        />
        {canWrite ? (
          <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
            {t('mapping.actions.createRule')}
          </Button>
        ) : null}
      </Flex>

      {/* Rule table */}
      <Table
        rowKey="id"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={filtered}
        locale={{ emptyText: t('mapping.states.noRules') }}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        scroll={{ x: 960 }}
        rowClassName={(rule) => (rule.status === 'INACTIVE' ? 'opacity-50' : 'cursor-pointer')}
        onRow={(rule) => ({ onClick: () => onSelect(rule) })}
      />
    </Flex>
  )
}
