import { type FC } from 'react'
import { useTranslation } from 'react-i18next'
import { DownloadOutlined, SearchOutlined, SyncOutlined, UserAddOutlined } from '@ant-design/icons'
import { Button, Input, Select, Space } from 'antd'

import { DateRangePicker, FilterBar, type DateRangeValue } from '@/shared/ui'

import styles from './ProductionWorkbenchPage.module.scss'

type AssigneeOption = {
  readonly value: string
  readonly label: string
}

type ScaleDifficultyLevel = 'NORMAL' | 'HARD' | 'SPECIAL'

export const ProductionWorkbenchFilterBar: FC<{
  readonly search: string
  readonly scaleDifficultyLevel?: ScaleDifficultyLevel
  readonly dates: DateRangeValue
  readonly tab: 'scale' | 'blocked' | 'qc' | 'all' | 'ready' | 'sent' | 'cancelled' | string
  readonly viewMode?: 'scale' | 'qc' | 'general'
  readonly scaleAssigneeId?: string
  readonly canAssignScale: boolean
  readonly canRecheckBlocked?: boolean
  readonly scaleAssigneeOptions: AssigneeOption[]
  readonly selectedRowCount: number
  readonly exportCsvLoading: boolean
  readonly exportQcLoading: boolean
  readonly recheckLoading: boolean
  readonly reassignLoading: boolean
  readonly onSearchChange: (value: string) => void
  readonly onSearchSubmit: (value: string) => void
  readonly onScaleDifficultyChange: (value?: ScaleDifficultyLevel) => void
  readonly onDatesChange: (value: DateRangeValue) => void
  readonly onExportCsv: () => void
  readonly onExportQc: () => void
  readonly onRecheck: () => void
  readonly onScaleAssigneeChange: (value?: string) => void
  readonly onBulkAssign: () => void
  // CS Assignment Filters & Bulk Actions
  readonly csAssigneeFilter?: string
  readonly onCsAssigneeFilterChange?: (value?: string) => void
  readonly csAssigneeOptions?: AssigneeOption[]
  readonly csAssigneeId?: string
  readonly onCsAssigneeChange?: (value?: string) => void
  readonly onBulkAssignCs?: () => void
  readonly bulkAssignCsLoading?: boolean
}> = ({
  search,
  scaleDifficultyLevel,
  dates,
  tab,
  viewMode = 'general',
  scaleAssigneeId,
  canAssignScale,
  canRecheckBlocked,
  scaleAssigneeOptions,
  selectedRowCount,
  exportCsvLoading,
  exportQcLoading,
  recheckLoading,
  reassignLoading,
  onSearchChange,
  onSearchSubmit,
  onScaleDifficultyChange,
  onDatesChange,
  onExportCsv,
  onExportQc,
  onRecheck,
  onScaleAssigneeChange,
  onBulkAssign,
  csAssigneeFilter,
  onCsAssigneeFilterChange,
  csAssigneeOptions,
  csAssigneeId,
  onCsAssigneeChange,
  onBulkAssignCs,
  bulkAssignCsLoading,
}) => {
  const { t } = useTranslation()
  const isScaleContext = viewMode === 'scale' || tab === 'scale' || tab === 'need_scale'

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
        {/* CS / Assignee filter */}
        {isScaleContext && onCsAssigneeFilterChange && csAssigneeOptions ? (
          <Select
            allowClear
            className={styles.filter}
            aria-label={t('portal.production.filterCsAssignee', { defaultValue: 'Lọc theo CS' })}
            value={csAssigneeFilter}
            placeholder={t('portal.production.filterCsAssignee', { defaultValue: 'Lọc theo CS' })}
            options={[
              {
                value: 'UNASSIGNED',
                label: t('portal.production.csUnassignedOption', {
                  defaultValue: '⚠️ Chưa phân công CS',
                }),
              },
              ...csAssigneeOptions,
            ]}
            onChange={onCsAssigneeFilterChange}
          />
        ) : null}

        {viewMode === 'qc' || tab === 'qc' ? (
          <Button icon={<DownloadOutlined />} loading={exportQcLoading} onClick={onExportQc}>
            {t('portal.production.exportQc')}
          </Button>
        ) : null}

        {/* Bulk Assign CS (Primary in Scale) */}
        {canAssignScale && isScaleContext && onBulkAssignCs && csAssigneeOptions ? (
          <>
            <Select
              showSearch
              allowClear
              className={styles.filter}
              aria-label={t('portal.production.selectCsAssignee', {
                defaultValue: 'Chọn CS để gán',
              })}
              value={csAssigneeId}
              placeholder={t('portal.production.selectCsAssignee', {
                defaultValue: 'Chọn CS để gán',
              })}
              options={csAssigneeOptions}
              onChange={onCsAssigneeChange}
            />
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              disabled={!selectedRowCount || !csAssigneeId}
              loading={bulkAssignCsLoading}
              onClick={onBulkAssignCs}
            >
              {t('portal.production.bulkAssignCs', {
                count: selectedRowCount,
                defaultValue: `Gán CS (${selectedRowCount})`,
              })}
            </Button>
          </>
        ) : null}

        {/* Bulk Assign Designer */}
        {canAssignScale && !isScaleContext ? (
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
          {(canRecheckBlocked ?? canAssignScale) ? (
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
