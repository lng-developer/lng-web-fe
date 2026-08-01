import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { HistoryOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Empty, List, Select, Space, Typography } from 'antd'

import { SearchInput, StatusTag } from '@/shared/ui'

import type { MappingRule } from '../api/mappingApi'

function ruleTitle(rule: MappingRule) {
  return String(
    rule.name ?? rule.configCode ?? rule.matchValue ?? rule.vendorName ?? rule.code ?? rule.id,
  )
}

function ruleDescription(rule: MappingRule) {
  const output =
    rule.normalizedValue ?? rule.outputAction ?? rule.productTypeGroupName ?? rule.vendorName
  const scope = rule.shopName ?? rule.marketplaceCode ?? rule.salesChannelCode ?? 'Global'
  return `${String(output ?? '—')} · ${String(scope)}`
}

export function RuleInventoryPanel({
  canWrite,
  loading,
  rules,
  search,
  status,
  selectedId,
  onCreate,
  onHistory,
  onSearchChange,
  onSelect,
  onStatusChange,
}: {
  readonly canWrite: boolean
  readonly loading?: boolean
  readonly rules: MappingRule[]
  readonly search: string
  readonly status?: 'ACTIVE' | 'INACTIVE'
  readonly selectedId?: string
  readonly onCreate: () => void
  readonly onHistory: (rule: MappingRule) => void
  readonly onSearchChange: (value: string) => void
  readonly onSelect: (rule: MappingRule) => void
  readonly onStatusChange: (value?: 'ACTIVE' | 'INACTIVE') => void
}) {
  const { t } = useTranslation()
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return rules.filter(
      (rule) =>
        (!status || rule.status === status) &&
        (!query || `${ruleTitle(rule)} ${ruleDescription(rule)}`.toLowerCase().includes(query)),
    )
  }, [rules, search, status])

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <Space.Compact block>
        <SearchInput
          aria-label={t('mapping.filters.searchRules')}
          placeholder={t('mapping.filters.searchRules')}
          value={search}
          onSearchChange={onSearchChange}
        />
        <Select
          allowClear
          aria-label={t('mapping.filters.status')}
          className="min-w-28"
          value={status}
          options={[
            { value: 'ACTIVE', label: t('mapping.states.active') },
            { value: 'INACTIVE', label: t('mapping.states.inactive') },
          ]}
          onChange={onStatusChange}
        />
      </Space.Compact>
      {canWrite ? (
        <Button block icon={<PlusOutlined />} onClick={onCreate}>
          {t('mapping.actions.createRule')}
        </Button>
      ) : null}
      <List
        className="min-h-0 overflow-auto"
        loading={loading}
        locale={{ emptyText: <Empty description={t('mapping.states.noRules')} /> }}
        dataSource={filtered}
        renderItem={(rule) => (
          <List.Item
            className={selectedId === rule.id ? '!bg-primary-light !px-2' : '!px-2'}
            actions={[
              <Button
                key="history"
                type="text"
                icon={<HistoryOutlined />}
                aria-label={t('mapping.actions.history')}
                onClick={(event) => {
                  event.stopPropagation()
                  onHistory(rule)
                }}
              />,
            ]}
            onClick={() => onSelect(rule)}
          >
            <List.Item.Meta
              title={<Typography.Text strong>{ruleTitle(rule)}</Typography.Text>}
              description={ruleDescription(rule)}
            />
            <StatusTag status={rule.status === 'ACTIVE' ? 'operational' : 'cancelled'}>
              {t(rule.status === 'ACTIVE' ? 'mapping.states.active' : 'mapping.states.inactive')}
            </StatusTag>
          </List.Item>
        )}
      />
    </div>
  )
}
