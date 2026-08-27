import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

let tableRenderCount = 0

vi.mock('antd', () => ({
  Alert: ({ message }: { message: string }) => <div>{message}</div>,
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
  Empty: Object.assign(() => <div />, { PRESENTED_IMAGE_SIMPLE: 'simple' }),
  InputNumber: () => <input />,
  Pagination: () => <div />,
  Select: ({
    options = [],
    onChange,
    ...props
  }: {
    options?: Array<{ value: string; label: string }>
    onChange?: (value: string) => void
  }) => (
    <select {...props} onChange={(event) => onChange?.(event.target.value)}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  Space: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Table: ({ dataSource }: { dataSource: Array<{ legacyProductId: string }> }) => {
    tableRenderCount += 1
    return <div>{dataSource.map((row) => row.legacyProductId).join(',')}</div>
  },
  Typography: { Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span> },
}))

import { VendorMigrationTabPage } from '@/features/portal/vendors/pages/VendorMigrationTabPage'

afterEach(() => {
  cleanup()
  tableRenderCount = 0
})

test('does not re-render the review table when only the Product Type Group changes', () => {
  render(
    <VendorMigrationTabPage
      canWrite
      rows={[
        {
          legacyProductId: 'legacy-1',
          vendorCode: 'VENDOR',
          vendorName: 'Vendor',
          code: 'PRODUCT',
          name: 'Product',
          externalProductId: null,
          variantCount: 1,
          productTypeGroupCode: null,
        },
      ]}
      loading={false}
      error={null}
      currentPage={1}
      currentPageSize={20}
      total={1}
      productTypeGroups={[{ id: 'group-1', code: 'TS', name: 'T-Shirt', status: 'ACTIVE' }]}
      pending={1}
      assigning={false}
      onPageChange={vi.fn()}
      onAssign={vi.fn()}
    />,
  )

  expect(tableRenderCount).toBe(1)
  fireEvent.change(screen.getByLabelText('Product Type Group for selected migration products'), {
    target: { value: 'group-1' },
  })
  expect(tableRenderCount).toBe(1)
})
