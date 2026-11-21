import type { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { ReloadOutlined } from '@ant-design/icons'
import { Button, Input, Select, Tooltip } from 'antd'

import { DateRangePicker, type DateRangeValue, UiTabLabel, UiTabs } from '@/shared/ui'
import { STATUS_TABS } from '../constants/psdTasksConstants'
import styles from '../pages/PsdTasksPage.module.scss'

export interface PsdTasksFilterBarProps {
  activeTabKey: string
  onTabChange: (key: string) => void
  counts: Record<string, number>
  salesChannelCode?: 'AMAZON' | 'ETSY'
  search: string
  onSearchChange: (value: string) => void
  etsyListingId: string
  onEtsyListingIdChange: (value: string) => void
  selectedSellerId?: string
  onSellerChange: (sellerId?: string) => void
  shopOptions: Array<{ label: string; value: string }>
  dateRange: DateRangeValue
  onDateRangeChange: (range: DateRangeValue) => void
  onRefresh: () => void
  isRefreshing: boolean
}

export const PsdTasksFilterBar: FC<PsdTasksFilterBarProps> = ({
  activeTabKey,
  onTabChange,
  counts,
  salesChannelCode,
  search,
  onSearchChange,
  etsyListingId,
  onEtsyListingIdChange,
  selectedSellerId,
  onSellerChange,
  shopOptions,
  dateRange,
  onDateRangeChange,
  onRefresh,
  isRefreshing,
}) => {
  const { t } = useTranslation()

  return (
    <>
      {/* Top row: Status Tabs + DateRangePicker */}
      <div className={styles.topRow}>
        <div className={styles.tabs}>
          <UiTabs
            activeKey={activeTabKey}
            onChange={onTabChange}
            items={STATUS_TABS.map((tab) => ({
              key: tab.key,
              label: (
                <UiTabLabel count={counts[tab.key]} active={activeTabKey === tab.key}>
                  {t(tab.titleKey, { defaultValue: tab.defaultTitle })}
                </UiTabLabel>
              ),
            }))}
          />
        </div>

        <div className={styles.headerActions}>
          <DateRangePicker allowClear value={dateRange} onChange={onDateRangeChange} />
        </div>
      </div>

      {/* Filter bar: Search + Seller + Refresh */}
      <div className={styles.filterBar}>
        <Input
          placeholder={
            salesChannelCode === 'ETSY'
              ? t('portal.design.searchEtsyPlaceholder', {
                  defaultValue: 'Search Listing ID, SKU...',
                })
              : salesChannelCode === 'AMAZON'
                ? t('portal.design.searchAmazonPlaceholder', {
                    defaultValue: 'Search ASIN, SKU...',
                  })
                : t('portal.design.searchAllPlaceholder', {
                    defaultValue: 'Search ASIN, Etsy Listing ID, SKU...',
                  })
          }
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          allowClear
          className={styles.search}
        />
        <Input
          placeholder={t('portal.design.etsyListingId', { defaultValue: 'Etsy Listing ID' })}
          value={etsyListingId}
          onChange={(e) => onEtsyListingIdChange(e.target.value)}
          allowClear
          style={{ width: 180 }}
        />
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder={t('portal.design.shop', { defaultValue: 'Shop' })}
          value={selectedSellerId}
          onChange={onSellerChange}
          className={styles.sellerSelect}
          options={shopOptions}
        />
        <Tooltip title={t('common.refresh', { defaultValue: 'Refresh' })}>
          <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={isRefreshing} />
        </Tooltip>
      </div>
    </>
  )
}
