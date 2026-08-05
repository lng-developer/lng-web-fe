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

export function TableFooter({
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
          options={[10, 20, 50].map((value) => ({ value, label: value }))}
          onChange={onPageSizeChange}
          style={{ width: 80 }}
        />
        <Pagination defaultCurrent={1} pageSize={pageSize} total={total} showSizeChanger={false} />
      </Flex>
    </Flex>
  )
}
