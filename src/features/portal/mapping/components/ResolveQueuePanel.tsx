import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Flex, Select, Space, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'

import { CopyableOrderId, EmptyState, SearchInput, StatusTag } from '@/shared/ui'

import type { UnmatchedMappingItem } from '../api/mappingApi'
import { getStageForFixType, type MappingPipelineStage } from '../model/mappingModel'

export function ResolveQueuePanel({
  items,
  loading,
  selectedId,
  blocker,
  search,
  onBlockerChange,
  onSearchChange,
  onSelect,
  onRecommendedStage,
}: {
  readonly items: UnmatchedMappingItem[]
  readonly loading?: boolean
  readonly selectedId?: string
  readonly blocker?: string
  readonly search: string
  readonly onBlockerChange: (value?: string) => void
  readonly onSearchChange: (value: string) => void
  readonly onSelect: (item: UnmatchedMappingItem) => void
  readonly onRecommendedStage: (stage: MappingPipelineStage) => void
}) {
  const { t } = useTranslation()
  const selectItem = useCallback(
    (item: UnmatchedMappingItem) => {
      onSelect(item)
      const stage = getStageForFixType(item.recommendedFixTypes?.[0])
      if (stage) onRecommendedStage(stage)
    },
    [onRecommendedStage, onSelect],
  )
  const blockers = [...new Set(items.flatMap((item) => item.blockingReasons))]
  const columns = useMemo<ColumnsType<UnmatchedMappingItem>>(
    () => [
      {
        title: t('mapping.fields.order'),
        render: (_, item) => (
          <CopyableOrderId
            value={item.externalOrderId}
            fallback={t('mapping.states.unavailable')}
          />
        ),
      },
      {
        title: 'SKU',
        dataIndex: 'sku',
        render: (value) => value || t('mapping.states.unavailable'),
      },
      {
        title: t('mapping.context.shop'),
        render: (_, item) => item.shop?.name || t('mapping.states.unavailable'),
      },
      {
        title: t('mapping.filters.stage'),
        dataIndex: 'blockedStage',
        render: (value) => value || t('mapping.states.unavailable'),
      },
      {
        title: t('mapping.filters.blocker'),
        render: (_, item) => (
          <Space size={4} wrap>
            {item.blockingReasons.slice(0, 2).map((reason) => (
              <StatusTag key={reason} status="warning">
                {reason}
              </StatusTag>
            ))}
          </Space>
        ),
      },
      {
        title: t('mapping.filters.age'),
        width: 120,
        render: (_, item) =>
          item.createdAt
            ? new Date(item.createdAt).toLocaleDateString()
            : t('mapping.states.unavailable'),
      },
    ],
    [t],
  )

  return (
    <Flex vertical gap={16} style={{ minHeight: 0 }}>
      <Flex gap={8}>
        <div style={{ flex: '1 1 0', minWidth: 0 }}>
          <SearchInput
            aria-label={t('mapping.filters.searchQueue')}
            placeholder={t('mapping.filters.searchQueue')}
            value={search}
            onSearchChange={onSearchChange}
          />
        </div>
        <Select
          allowClear
          style={{ width: 144 }}
          aria-label={t('mapping.filters.blocker')}
          placeholder={t('mapping.filters.blocker')}
          value={blocker}
          options={blockers.map((value) => ({ value, label: value }))}
          onChange={onBlockerChange}
        />
      </Flex>
      <Table
        className="min-h-0 overflow-auto"
        rowKey="id"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={items}
        locale={{ emptyText: <EmptyState title={t('mapping.states.noQueue')} /> }}
        pagination={false}
        rowClassName={(item) => (selectedId === item.id ? '!bg-primary-light' : 'cursor-pointer')}
        scroll={{ x: 820, y: 500 }}
        onRow={(item) => ({ onClick: () => selectItem(item) })}
      />
    </Flex>
  )
}
