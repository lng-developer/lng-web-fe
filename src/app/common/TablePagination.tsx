import { useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { DoubleLeftOutlined, DoubleRightOutlined } from '@ant-design/icons'
import type { TablePaginationConfig } from 'antd'
import { Button, InputNumber, Pagination, Select } from 'antd'

import styles from '@/shared/ui/sharedUi.module.scss'

const COMMON_TABLE_PAGINATION = {
  defaultPageSize: 20,
  pageSizeOptions: ['20', '50', '100'],
  hideOnSinglePage: false,
  showSizeChanger: true,
  showQuickJumper: true,
  responsive: true,
} satisfies TablePaginationConfig

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
  const pageSizeOptions = useMemo(
    () =>
      (merged.pageSizeOptions ?? COMMON_TABLE_PAGINATION.pageSizeOptions).map((value) => ({
        value: Number(value),
        label: String(value),
      })),
    [merged.pageSizeOptions],
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

  if (merged.hideOnSinglePage && total <= pageSize) return null

  return (
    <div className={styles.tablePagination}>
      {showSizeChanger ? (
        <div className={styles.tablePaginationPageSize}>
          <span>{t('common.pagination.rowsPerPage')}</span>
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
      ) : (
        <span />
      )}

      <div className={styles.tablePaginationCenter}>
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
      </div>

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
      ) : (
        <span />
      )}
    </div>
  )
}
