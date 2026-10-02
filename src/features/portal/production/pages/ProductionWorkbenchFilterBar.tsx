import { type FC } from 'react'
import { useTranslation } from 'react-i18next'
import { DownloadOutlined, SearchOutlined, SyncOutlined } from '@ant-design/icons'
import { Button, Input, Select, Space } from 'antd'

import { DateRangePicker, FilterBar, type DateRangeValue } from '@/shared/ui'

import type { ProductionStatus } from '../api/productionApi'
import styles from './ProductionWorkbenchPage.module.scss'

type FilterOption = {
  readonly value: ProductionStatus
  readonly label: string
}

type AssigneeOption = {
  readonly value: string
  readonly label: string
}

type ScaleDifficultyLevel = 'NORMAL' | 'HARD' | 'SPECIAL'

export const ProductionWorkbenchFilterBar: FC<{
  readonly search: string
  readonly status?: ProductionStatus
  readonly scaleDifficultyLevel?: ScaleDifficultyLevel
  readonly dates: DateRangeValue
  readonly tab: 'scale' | 'blocked' | 'qc'
  readonly statusOptions: FilterOption[]
  readonly scaleAssigneeId?: string
  readonly canAssignScale: boolean
  readonly scaleAssigneeOptions: AssigneeOption[]
  readonly selectedRowCount: number
  readonly exportCsvLoading: boolean
  readonly exportQcLoading: boolean
  readonly recheckLoading: boolean
  readonly reassignLoading: boolean
  readonly onSearchChange: (value: string) => void
  readonly onSearchSubmit: (value: string) => void
  readonly onStatusChange: (value?: ProductionStatus) => void
  readonly onScaleDifficultyChange: (value?: ScaleDifficultyLevel) => void
  readonly onDatesChange: (value: DateRangeValue) => void
  readonly onExportCsv: () => void
  readonly onExportQc: () => void
  readonly onRecheck: () => void
  readonly onScaleAssigneeChange: (value?: string) => void
  readonly onBulkAssign: () => void
}> = ({
  search,
  status,
  scaleDifficultyLevel,
  dates,
  tab,
  statusOptions,
  scaleAssigneeId,
  canAssignScale,
  scaleAssigneeOptions,
  selectedRowCount,
  exportCsvLoading,
  exportQcLoading,
  recheckLoading,
  reassignLoading,
  onSearchChange,
  onSearchSubmit,
  onStatusChange,
  onScaleDifficultyChange,
  onDatesChange,
  onExportCsv,
  onExportQc,
  onRecheck,
  onScaleAssigneeChange,
  onBulkAssign,
}) => {
  const { t } = useTranslation()

  return (
    <div className={styles.queueControls}>
      <FilterBar
        className={styles.queueFilterBar}
        label={t('portal.production.filters')}
        contentClassName={styles.filters}
      >
        <Input
          className={styles.search}
          allowClear
          value={search}
          placeholder={t('portal.production.search')}
          onChange={(event) => onSearchChange(event.target.value)}
          onPressEnter={(event) => onSearchSubmit(event.currentTarget.value)}
          suffix={
            <Button
              aria-label={t('portal.production.search')}
              className={styles.searchSubmit}
              icon={<SearchOutlined />}
              size="small"
              type="text"
              onClick={() => onSearchSubmit(search)}
            />
          }
        />
        <Select
          className={styles.filter}
          allowClear
          value={status}
          placeholder={t('portal.production.allStatuses')}
          options={statusOptions}
          onChange={onStatusChange}
        />
        <Select
          className={styles.filter}
          allowClear
          value={scaleDifficultyLevel}
          placeholder={t('portal.production.allScaleDifficulty')}
          options={(['NORMAL', 'HARD', 'SPECIAL'] as const).map((value) => ({
            value,
            label: t(`portal.production.scaleDifficulties.${value}`),
          }))}
          onChange={onScaleDifficultyChange}
        />
        <DateRangePicker
          aria-label={t('foundation.controls.dateRange')}
          className={styles.dateRange}
          value={dates}
          onChange={onDatesChange}
        />
        {tab === 'qc' ? (
          <Button icon={<DownloadOutlined />} loading={exportQcLoading} onClick={onExportQc}>
            {t('portal.production.exportQc')}
          </Button>
        ) : null}
        {canAssignScale ? (
          <>
            <Select
              showSearch
              allowClear
              className={styles.filter}
              value={scaleAssigneeId}
              placeholder={t('portal.production.selectAssignee')}
              options={scaleAssigneeOptions}
              onChange={onScaleAssigneeChange}
            />
            <Button
              disabled={!selectedRowCount || !scaleAssigneeId}
              loading={reassignLoading}
              onClick={onBulkAssign}
            >
              {t('portal.production.bulkAssign', { count: selectedRowCount })}
            </Button>
          </>
        ) : null}
        <Space className={styles.filterActions}>
          <Button icon={<DownloadOutlined />} loading={exportCsvLoading} onClick={onExportCsv}>
            {t('portal.production.exportCsv')}
          </Button>
          {canAssignScale ? (
            <Button icon={<SyncOutlined />} loading={recheckLoading} onClick={onRecheck}>
              {t('portal.production.recheckBlocked')}
            </Button>
          ) : null}
        </Space>
      </FilterBar>
    </div>
  )
}

export default ProductionWorkbenchFilterBar
