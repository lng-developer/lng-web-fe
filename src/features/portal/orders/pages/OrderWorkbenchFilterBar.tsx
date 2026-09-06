import { type FC, memo } from 'react'
import { Button, Select } from 'antd'

import { DateRangePicker, FilterBar, SearchInput } from '@/shared/ui'
import type { DateRangeValue } from '@/shared/ui/DateRangePicker'

import styles from './OrderWorkbenchPage.module.scss'

type SelectOption = {
  readonly value: string
  readonly label: string
}

const filterSelectOption = (input: string, option?: SelectOption) =>
  (option?.label ?? '').toLowerCase().includes(input.trim().toLowerCase())

type OrderWorkbenchFilterBarProps = {
  readonly search: string
  readonly shopId?: string
  readonly vendorId?: string
  readonly dates: DateRangeValue
  readonly hasActiveFilters: boolean
  readonly shopOptions: SelectOption[]
  readonly vendorOptions: SelectOption[]
  readonly filtersLabel: string
  readonly searchPlaceholder: string
  readonly shopPlaceholder: string
  readonly vendorPlaceholder: string
  readonly clearLabel: string
  readonly loadingShops: boolean
  readonly loadingVendors: boolean
  readonly onSearchChange: (value: string) => void
  readonly onShopChange: (value?: string) => void
  readonly onVendorChange: (value?: string) => void
  readonly onDatesChange: (value: { dateFrom?: string; dateTo?: string }) => void
  readonly onClearFilters: () => void
}

export const OrderWorkbenchFilterBar: FC<OrderWorkbenchFilterBarProps> = memo(
  function OrderWorkbenchFilterBar({
    search,
    shopId,
    vendorId,
    dates,
    hasActiveFilters,
    shopOptions,
    vendorOptions,
    filtersLabel,
    searchPlaceholder,
    shopPlaceholder,
    vendorPlaceholder,
    clearLabel,
    loadingShops,
    loadingVendors,
    onSearchChange,
    onShopChange,
    onVendorChange,
    onDatesChange,
    onClearFilters,
  }) {
    return (
      <FilterBar label={filtersLabel} contentClassName={styles.filters}>
        <SearchInput
          className={styles.orderSearch}
          value={search}
          onSearchChange={onSearchChange}
          placeholder={searchPlaceholder}
        />
        <Select
          className={styles.filterSelect}
          allowClear
          showSearch
          optionFilterProp="label"
          filterOption={filterSelectOption}
          value={shopId}
          loading={loadingShops}
          placeholder={shopPlaceholder}
          options={shopOptions}
          onChange={onShopChange}
        />
        <Select
          className={styles.filterSelect}
          allowClear
          showSearch
          optionFilterProp="label"
          filterOption={filterSelectOption}
          value={vendorId}
          loading={loadingVendors}
          placeholder={vendorPlaceholder}
          options={vendorOptions}
          onChange={onVendorChange}
        />
        <DateRangePicker style={{ maxWidth: 'none' }} value={dates} onChange={onDatesChange} />
        {hasActiveFilters ? <Button onClick={onClearFilters}>{clearLabel}</Button> : null}
      </FilterBar>
    )
  },
)

export default OrderWorkbenchFilterBar
