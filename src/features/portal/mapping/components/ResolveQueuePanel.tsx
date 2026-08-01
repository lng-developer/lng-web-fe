import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { List, Select, Skeleton, Typography } from 'antd'

import { EmptyState, SearchInput, StatusTag } from '@/shared/ui'

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

  return (
    <div className="flex min-h-0 flex-col gap-2">
      <SearchInput
        aria-label={t('mapping.filters.searchQueue')}
        placeholder={t('mapping.filters.searchQueue')}
        value={search}
        onSearchChange={onSearchChange}
      />
      <Select
        allowClear
        aria-label={t('mapping.filters.blocker')}
        placeholder={t('mapping.filters.blocker')}
        value={blocker}
        options={blockers.map((value) => ({ value, label: value }))}
        onChange={onBlockerChange}
      />
      {loading ? <Skeleton active paragraph={{ rows: 7 }} /> : null}
      {!loading && items.length === 0 ? <EmptyState title={t('mapping.states.noQueue')} /> : null}
      <List
        className="min-h-0 overflow-auto"
        dataSource={items}
        renderItem={(item) => (
          <List.Item
            className={selectedId === item.id ? '!bg-primary-light !px-2' : '!px-2'}
            onClick={() => selectItem(item)}
          >
            <button className="w-full cursor-pointer border-0 bg-transparent text-left">
              <Typography.Text strong>
                {item.sku || item.externalOrderId || item.id}
              </Typography.Text>
              <div className="mt-1 flex flex-wrap gap-1">
                {item.blockingReasons.slice(0, 2).map((reason) => (
                  <StatusTag key={reason} status="warning">
                    {reason}
                  </StatusTag>
                ))}
              </div>
            </button>
          </List.Item>
        )}
      />
    </div>
  )
}
