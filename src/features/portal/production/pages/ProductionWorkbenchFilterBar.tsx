import type { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { DownloadOutlined } from '@ant-design/icons'
import { Button, Input, Select } from 'antd'

import { FilterBar } from '@/shared/ui'

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
  readonly tab: 'scale' | 'blocked' | 'qc'
  readonly statusOptions: FilterOption[]
  readonly scaleAssigneeId?: string
  readonly canAssignScale: boolean
  readonly scaleAssigneeOptions: AssigneeOption[]
  readonly selectedRowCount: number
  readonly exportQcLoading: boolean
  readonly reassignLoading: boolean
  readonly onSearchChange: (value: string) => void
  readonly onSearchSubmit: (value: string) => void
  readonly onStatusChange: (value?: ProductionStatus) => void
  readonly onScaleDifficultyChange: (value?: ScaleDifficultyLevel) => void
  readonly onExportQc: () => void
  readonly onScaleAssigneeChange: (value?: string) => void
  readonly onBulkAssign: () => void
}> = ({
  search,
  status,
  scaleDifficultyLevel,
  tab,
  statusOptions,
  scaleAssigneeId,
  canAssignScale,
  scaleAssigneeOptions,
  selectedRowCount,
  exportQcLoading,
  reassignLoading,
  onSearchChange,
  onSearchSubmit,
  onStatusChange,
  onScaleDifficultyChange,
  onExportQc,
  onScaleAssigneeChange,
  onBulkAssign,
}) => {
  const { t } = useTranslation()

  return (
    <div className={styles.queueControls}>
      <FilterBar label={t('portal.production.filters')} contentClassName={styles.filters}>
        <Input.Search
          className={styles.search}
          allowClear
          value={search}
          placeholder={t('portal.production.search')}
          onChange={(event) => onSearchChange(event.target.value)}
          onSearch={onSearchSubmit}
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
          options={['NORMAL', 'HARD', 'SPECIAL'].map((value) => ({ value, label: value }))}
          onChange={onScaleDifficultyChange}
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
      </FilterBar>
    </div>
  )
}

export default ProductionWorkbenchFilterBar
