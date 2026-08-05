import { type ReactNode, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { HistoryOutlined, MoreOutlined, PlusOutlined, PoweroffOutlined } from '@ant-design/icons'
import { Button, Dropdown, Flex, Select, Space, Table, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'

import { SearchInput, StatusTag } from '@/shared/ui'

import type { MappingRule, MappingRuleType } from '../api/mappingApi'

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
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
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
  }, [fallback, refs, rules, search, status, type])
  const columns = useMemo<ColumnsType<MappingRule>>(
    () => [
      ...ruleFields[type].map((field) => ({
        key: field,
        title: t(`mapping.fields.${field}`),
        render: (_: unknown, rule: MappingRule) => displayValue(rule, field, refs, fallback),
      })),
      {
        key: 'priority',
        title: t('mapping.fields.priority'),
        width: 90,
        render: (_: unknown, rule) => String(rule.priority ?? fallback),
      },
      {
        key: 'status',
        title: t('mapping.fields.status'),
        width: 110,
        render: (_: unknown, rule) => (
          <StatusTag status={rule.status === 'ACTIVE' ? 'operational' : 'cancelled'}>
            {t(rule.status === 'ACTIVE' ? 'mapping.states.active' : 'mapping.states.inactive')}
          </StatusTag>
        ),
      },
      {
        key: 'updatedAt',
        title: t('mapping.fields.updatedAt'),
        width: 150,
        render: (_: unknown, rule) =>
          rule.updatedAt ? new Date(rule.updatedAt).toLocaleString() : fallback,
      },
      {
        key: 'actions',
        title: t('mapping.fields.actions'),
        width: 92,
        render: (_: unknown, rule) => (
          <Space size={0} onClick={(event) => event.stopPropagation()}>
            <Tooltip title={t('mapping.actions.history')}>
              <Button
                type="text"
                icon={<HistoryOutlined />}
                aria-label={t('mapping.actions.history')}
                onClick={() => onHistory(rule)}
              />
            </Tooltip>
            {canWrite ? (
              <Dropdown
                trigger={['click']}
                menu={{
                  items: [
                    {
                      key: 'status',
                      icon: <PoweroffOutlined />,
                      label: t(
                        rule.status === 'ACTIVE'
                          ? 'mapping.actions.disable'
                          : 'mapping.actions.enable',
                      ),
                      onClick: () => onToggleStatus(rule),
                    },
                  ],
                }}
              >
                <Button
                  type="text"
                  icon={<MoreOutlined />}
                  aria-label={t('mapping.actions.ruleActions')}
                />
              </Dropdown>
            ) : null}
          </Space>
        ),
      },
    ],
    [canWrite, fallback, onHistory, onToggleStatus, refs, t, type],
  )

  return (
    <Flex vertical gap={16} style={{ minHeight: 0 }}>
      <Flex gap={12} wrap="wrap" align="center">
        {shopFilter ? <div style={{ flex: '0 0 224px' }}>{shopFilter}</div> : null}
        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          <SearchInput
            aria-label={t('mapping.filters.searchRules')}
            placeholder={t('mapping.filters.searchRules')}
            value={search}
            onSearchChange={onSearchChange}
          />
        </div>
        <Select
          allowClear
          aria-label={t('mapping.filters.status')}
          style={{ width: 160 }}
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
      <Table
        rowKey="id"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={filtered}
        locale={{ emptyText: t('mapping.states.noRules') }}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        scroll={{ x: 980 }}
        onRow={(rule) => ({ onClick: () => onSelect(rule) })}
      />
    </Flex>
  )
}
