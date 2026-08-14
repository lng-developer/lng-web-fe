import type { FC } from 'react'
import { Button, Select } from 'antd'

import { DateRangePicker, FilterBar, SearchInput } from '@/shared/ui'
import type { DateRangeValue } from '@/shared/ui/DateRangePicker'

import styles from './OrderWorkbenchPage.module.scss'

type SelectOption = {
  readonly value: string
  readonly label: string
}

type OrderWorkbenchFilterBarProps = {
  readonly search: string
  readonly shopId?: string
  readonly addressValidationStatus?: string
  readonly dates: DateRangeValue
  readonly hasActiveFilters: boolean
  readonly shopOptions: SelectOption[]
  readonly addressStatusOptions: SelectOption[]
  readonly filtersLabel: string
  readonly searchPlaceholder: string
  readonly shopPlaceholder: string
  readonly addressPlaceholder: string
  readonly clearLabel: string
  readonly loadingShops: boolean
  readonly onSearchChange: (value: string) => void
  readonly onShopChange: (value?: string) => void
  readonly onAddressValidationStatusChange: (value?: string) => void
  readonly onDatesChange: (value: { dateFrom?: string; dateTo?: string }) => void
  readonly onClearFilters: () => void
}

export const OrderWorkbenchFilterBar: FC<OrderWorkbenchFilterBarProps> = ({
  search,
  shopId,
  addressValidationStatus,
  dates,
  hasActiveFilters,
  shopOptions,
  addressStatusOptions,
  filtersLabel,
  searchPlaceholder,
  shopPlaceholder,
  addressPlaceholder,
  clearLabel,
  loadingShops,
  onSearchChange,
  onShopChange,
  onAddressValidationStatusChange,
  onDatesChange,
  onClearFilters,
}) => {
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
        value={shopId}
        loading={loadingShops}
        placeholder={shopPlaceholder}
        options={shopOptions}
        onChange={onShopChange}
      />
      <Select
        className={styles.filterSelect}
        allowClear
        value={addressValidationStatus}
        placeholder={addressPlaceholder}
        options={addressStatusOptions}
        onChange={onAddressValidationStatusChange}
      />
      <DateRangePicker value={dates} onChange={onDatesChange} />
      {hasActiveFilters ? <Button onClick={onClearFilters}>{clearLabel}</Button> : null}
    </FilterBar>
  )
}

export default OrderWorkbenchFilterBar
