import { useCallback, useDeferredValue, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Flex, Select, Spin, Typography } from 'antd'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

import { EmptyState, SearchInput } from '@/shared/ui'

import type { UnmatchedMappingItem } from '../api/mappingApi'
import { getStageForFixType, type MappingPipelineStage } from '../model/mappingModel'
import styles from '../pages/MappingWorkspacePage.module.scss'

dayjs.extend(relativeTime)

const STAGE_LABEL_KEYS: Record<string, string> = {
  SKU_CLEANUP: 'mapping.pipeline.skuCleanup',
  PRODUCT_MAPPING: 'mapping.pipeline.productMapping',
  INPUT_SEMANTICS: 'mapping.pipeline.inputSemantics',
  VALUE_ALIASES: 'mapping.pipeline.valueAliases',
  VENDOR_ROUTING: 'mapping.pipeline.vendorRouting',
}

const fallbackCodeLabel = (value: string) => value.replace(/_/g, ' ')

function getAgeLabel(createdAt?: string | null): { label: string; overdue: boolean } {
  if (!createdAt) return { label: '—', overdue: false }
  const d = dayjs(createdAt)
  const hoursAgo = dayjs().diff(d, 'hour')
  return {
    label: d.fromNow(),
    overdue: hoursAgo >= 24,
  }
}

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
  const deferredSearch = useDeferredValue(search)

  const selectItem = useCallback(
    (item: UnmatchedMappingItem) => {
      onSelect(item)
      const stage = getStageForFixType(item.recommendedFixTypes?.[0])
      if (stage) onRecommendedStage(stage)
    },
    [onRecommendedStage, onSelect],
  )

  const blockerOptions = useMemo(
    () =>
      [...new Set(items.flatMap((item) => item.blockingReasons))].map((v) => ({
        value: v,
        label: t(`mapping.blockers.${v}`, { defaultValue: fallbackCodeLabel(v) }),
      })),
    [items, t],
  )

  const filteredItems = useMemo(() => {
    if (!deferredSearch && !blocker) return items
    return items.filter((item) => {
      if (blocker && !item.blockingReasons.includes(blocker)) return false
      if (deferredSearch) {
        const q = deferredSearch.toLowerCase()
        return (
          item.sku?.toLowerCase().includes(q) ||
          item.externalOrderId?.toLowerCase().includes(q) ||
          item.asin?.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [items, deferredSearch, blocker])

  return (
    <Flex className={styles.queuePanel} vertical gap={0}>
      {/* Filters */}
      <div className={styles.queueFilters}>
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
          size="middle"
          style={{ width: 140 }}
          aria-label={t('mapping.filters.blocker')}
          placeholder={t('mapping.filters.blocker')}
          value={blocker}
          options={blockerOptions}
          onChange={onBlockerChange}
        />
      </div>

      {/* Queue List */}
      <div className={styles.queueList}>
        {loading ? (
          <Flex justify="center" align="center" style={{ padding: 32 }}>
            <Spin />
          </Flex>
        ) : filteredItems.length === 0 ? (
          <EmptyState title={t('mapping.states.noQueue')} />
        ) : (
          filteredItems.map((item) => {
            const { label: ageLabel, overdue } = getAgeLabel(item.createdAt)
            const isSelected = selectedId === item.id
            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                className={`${styles.queueItem} ${isSelected ? styles.selected : ''}`}
                onClick={() => selectItem(item)}
                onKeyDown={(e) => e.key === 'Enter' && selectItem(item)}
              >
                {/* Row 1: SKU + Age */}
                <div className={styles.queueItemHeader}>
                  <Typography.Text className={styles.queueItemSku} title={item.sku ?? undefined}>
                    {item.sku || t('mapping.states.unavailable')}
                  </Typography.Text>
                  <span className={`${styles.queueItemAge} ${overdue ? styles.overdue : ''}`}>
                    {ageLabel}
                  </span>
                </div>

                {/* Row 2: Order ID + Stage badge + Blockers */}
                <div className={styles.queueItemMeta}>
                  {item.externalOrderId ? (
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                      #{item.externalOrderId.slice(-8)}
                    </Typography.Text>
                  ) : null}
                  {item.shop?.name ? (
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                      · {item.shop.name}
                    </Typography.Text>
                  ) : null}
                  {item.blockedStage ? (
                    <span className={`${styles.stageBadge} ${styles[item.blockedStage]}`}>
                      {t(STAGE_LABEL_KEYS[item.blockedStage] ?? '', {
                        defaultValue: fallbackCodeLabel(item.blockedStage),
                      })}
                    </span>
                  ) : null}
                  {item.blockingReasons.slice(0, 1).map((reason) => (
                    <span
                      key={reason}
                      style={{
                        fontSize: 11,
                        color: 'var(--ant-color-warning-text)',
                        background: 'var(--ant-color-warning-bg)',
                        padding: '1px 6px',
                        borderRadius: 4,
                      }}
                    >
                      {t(`mapping.blockers.${reason}`, { defaultValue: fallbackCodeLabel(reason) })}
                    </span>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>
    </Flex>
  )
}
