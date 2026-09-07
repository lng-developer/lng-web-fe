import { memo } from 'react'
import { Flex, Pagination, Select, Typography } from 'antd'

const { Text } = Typography

export interface TableFooterProps {
  readonly from: number
  readonly to: number
  readonly total: number
  readonly pageSize: number
  readonly summaryPrefix?: string
  readonly rowsPerPageLabel?: string
  readonly onPageSizeChange?: (value: number) => void
}

const PAGE_SIZE_OPTIONS = [
  { value: 10, label: 10 },
  { value: 20, label: 20 },
  { value: 50, label: 50 },
]

const SELECT_STYLE = { width: 80 } as const

export const TableFooter = memo(function TableFooter({
  from,
  to,
  total,
  pageSize,
  summaryPrefix = 'Showing',
  rowsPerPageLabel = 'Rows per page:',
  onPageSizeChange,
}: TableFooterProps) {
  return (
    <Flex justify="space-between" align="center" gap={16}>
      <Text>
        {summaryPrefix} {from}-{to} of {total}
      </Text>
      <Flex align="center" gap={8}>
        <Text type="secondary">{rowsPerPageLabel}</Text>
        <Select
          value={pageSize}
          options={PAGE_SIZE_OPTIONS}
          onChange={onPageSizeChange}
          style={SELECT_STYLE}
        />
        <Pagination defaultCurrent={1} pageSize={pageSize} total={total} showSizeChanger={false} />
      </Flex>
    </Flex>
  )
})
