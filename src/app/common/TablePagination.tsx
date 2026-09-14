import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { DoubleLeftOutlined, DoubleRightOutlined } from '@ant-design/icons'
import type { TablePaginationConfig } from 'antd'
import { Button, InputNumber, Pagination, Select } from 'antd'

import { DEFAULT_TABLE_PAGINATION } from '@/shared/constants/enum'
import styles from '@/shared/ui/sharedUi.module.scss'

const COMMON_TABLE_PAGINATION = DEFAULT_TABLE_PAGINATION satisfies TablePaginationConfig

export function CommonTablePagination({ pagination }: { pagination: TablePaginationConfig }) {
  const { t } = useTranslation()
  const merged = {
    ...COMMON_TABLE_PAGINATION,
    ...pagination,
  } satisfies TablePaginationConfig
  const current = merged.current ?? merged.defaultCurrent ?? 1
  const pageSize =
    merged.pageSize ?? merged.defaultPageSize ?? COMMON_TABLE_PAGINATION.defaultPageSize
  const total = merged.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const jumpPageRef = useRef<number | null>(current)
  const showSizeChanger = merged.showSizeChanger !== false
  const showQuickJumper = Boolean(merged.showQuickJumper)
  const pageSizeOptions = (merged.pageSizeOptions ?? COMMON_TABLE_PAGINATION.pageSizeOptions).map(
    (value) => ({
      value: Number(value),
      label: String(value),
    }),
  )

  const goToPage = (nextPage: number, nextPageSize = pageSize) => {
    const safePage = Math.min(Math.max(nextPage, 1), Math.max(1, Math.ceil(total / nextPageSize)))
    merged.onChange?.(safePage, nextPageSize)
  }

  const changePageSize = (nextPageSize: number) => {
    merged.onShowSizeChange?.(1, nextPageSize)
    merged.onChange?.(1, nextPageSize)
  }

  const submitJump = () => {
    if (!jumpPageRef.current) return
    goToPage(jumpPageRef.current)
  }

  const from = total === 0 ? 0 : (current - 1) * pageSize + 1
  const to = Math.min(current * pageSize, total)

  if (merged.hideOnSinglePage && total <= pageSize) return null

  return (
    <div className={styles.tablePagination}>
      <div className={styles.tablePaginationLeft}>
        <span className={styles.tablePaginationSummary}>
          {t('common.pagination.showingEntries', { from, to, total })}
        </span>
        {showSizeChanger ? (
          <div className={styles.tablePaginationPageSize}>
            <Select
              aria-label={t('common.pagination.rowsPerPage')}
              bordered={false}
              popupMatchSelectWidth={72}
              size="small"
              style={{ width: 72 }}
              value={pageSize}
              options={pageSizeOptions}
              onChange={changePageSize}
            />
          </div>
        ) : null}
      </div>

      <div className={styles.tablePaginationRight}>
        <Button
          aria-label={t('common.pagination.firstPage')}
          disabled={current <= 1}
          icon={<DoubleLeftOutlined />}
          type="text"
          onClick={() => goToPage(1)}
        />
        <Pagination
          current={current}
          pageSize={pageSize}
          total={total}
          showSizeChanger={false}
          showQuickJumper={false}
          onChange={goToPage}
        />
        <Button
          aria-label={t('common.pagination.lastPage')}
          disabled={current >= totalPages}
          icon={<DoubleRightOutlined />}
          type="text"
          onClick={() => goToPage(totalPages)}
        />
        {showQuickJumper ? (
          <div className={styles.tablePaginationJump}>
            <span>{t('common.pagination.jumpToPage')}</span>
            <InputNumber
              key={current}
              aria-label={t('common.pagination.jumpToPage')}
              controls={false}
              min={1}
              max={totalPages}
              size="small"
              defaultValue={current}
              onBlur={submitJump}
              onChange={(value) => {
                jumpPageRef.current = value
              }}
              onPressEnter={submitJump}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
