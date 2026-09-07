import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

let tableRenderCount = 0
let latestTableProps: Record<string, unknown> = {}

vi.mock('antd', () => ({
  Alert: ({ message }: { message: string }) => <div>{message}</div>,
  Image: ({ alt, src, onClick }: { alt: string; src: string; onClick?: () => void }) => (
    <button type="button" aria-label={alt} onClick={onClick}>
      <img alt={alt} src={src} />
    </button>
  ),
  Modal: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div role="dialog">{children}</div> : null,
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
  Empty: Object.assign(() => <div />, { PRESENTED_IMAGE_SIMPLE: 'simple' }),
  InputNumber: () => <input />,
  Pagination: () => <div />,
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
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
  Table: ({
    columns = [],
    dataSource,
    ...props
  }: {
    columns?: Array<{
      dataIndex?: string
      render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode
    }>
    dataSource: Array<Record<string, unknown>>
  }) => {
    tableRenderCount += 1
    latestTableProps = props
    return (
      <div>
        {dataSource
          .flatMap((row) =>
            columns.map((column) =>
              column.render?.(column.dataIndex ? row[column.dataIndex] : undefined, row),
            ),
          )
          .concat(dataSource.map((row) => row.id as React.ReactNode))
          .map((value, index) => (
            <span key={index}>{value}</span>
          ))}
      </div>
    )
  },
  Typography: { Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span> },
}))

vi.mock('@/app/common/CoreDataTable', () => ({
  CoreDataTable: ({
    columns = [],
    dataSource = [],
    ...props
  }: {
    columns?: Array<{
      dataIndex?: string
      render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode
    }>
    dataSource?: Array<Record<string, unknown>>
  }) => {
    tableRenderCount += 1
    latestTableProps = props
    return (
      <div>
        {dataSource
          .flatMap((row) =>
            columns.map((column) =>
              column.render?.(column.dataIndex ? row[column.dataIndex] : undefined, row),
            ),
          )
          .concat(dataSource.map((row) => row.id as React.ReactNode))
          .map((value, index) => (
            <span key={index}>{value}</span>
          ))}
      </div>
    )
  },
}))

import { VendorMigrationTabPage } from '@/features/portal/vendors/pages/VendorMigrationTabPage'
import i18n from '@/shared/i18n/i18n'

afterEach(() => {
  cleanup()
  tableRenderCount = 0
  latestTableProps = {}
})

beforeEach(async () => {
  await i18n.changeLanguage('en')
})

test('does not re-render the review table when only the Product Type Group changes', () => {
  render(
    <VendorMigrationTabPage
      canWrite
      rows={[
        {
          id: 'product-1',
          vendorCode: 'VENDOR',
          vendorName: 'Vendor',
          code: 'PRODUCT',
          name: 'Product',
          externalProductId: null,
          imageUrl: null,
          variantCount: 1,
        },
      ]}
      loading={false}
      error={null}
      currentPage={1}
      currentPageSize={20}
      total={1}
      productTypeGroups={[{ id: 'group-1', code: 'TS', name: 'T-Shirt', status: 'ACTIVE' }]}
      pending={1}
      orphaned={0}
      assigning={false}
      canCreateProductType
      creatingProductType={false}
      onCreateProductType={vi.fn()}
      onPageChange={vi.fn()}
      onAssign={vi.fn()}
    />,
  )

  expect(tableRenderCount).toBe(1)
  expect(screen.getByRole('button', { name: 'Create product type' })).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Product Type Group for selected migration products'), {
    target: { value: 'group-1' },
  })
  expect(tableRenderCount).toBe(1)
})

test('filters migration products by vendor before bulk selection', () => {
  const onFiltersChange = vi.fn()
  render(
    <VendorMigrationTabPage
      canWrite
      rows={[]}
      loading={false}
      error={null}
      productTypeGroups={[]}
      pending={0}
      orphaned={0}
      assigning={false}
      canCreateProductType={false}
      creatingProductType={false}
      onCreateProductType={vi.fn()}
      onAssign={vi.fn()}
      vendorOptions={[{ value: 'vendor-1', label: 'Beeful' }]}
      onFiltersChange={onFiltersChange}
    />,
  )

  fireEvent.change(screen.getByLabelText('Migration vendor filter'), {
    target: { value: 'vendor-1' },
  })

  expect(onFiltersChange).toHaveBeenCalledWith({ vendorId: 'vendor-1', q: undefined })
})

test('shows the vendor product thumbnail in migration review', () => {
  render(
    <VendorMigrationTabPage
      canWrite
      rows={[
        {
          id: 'product-1',
          vendorCode: 'VENDOR',
          vendorName: 'Vendor',
          code: 'PRODUCT',
          name: 'Product',
          externalProductId: null,
          imageUrl: 'https://cdn.example.test/product.jpg',
          variantCount: 1,
        },
      ]}
      loading={false}
      error={null}
      productTypeGroups={[]}
      pending={1}
      orphaned={0}
      assigning={false}
      canCreateProductType={false}
      creatingProductType={false}
      onCreateProductType={vi.fn()}
      onAssign={vi.fn()}
    />,
  )

  expect(screen.getByRole('img', { name: 'Product' }).getAttribute('src')).toBe(
    'https://cdn.example.test/product.jpg',
  )
})

test('uses the shared table with horizontal scrolling for migration products', () => {
  render(
    <VendorMigrationTabPage
      canWrite
      rows={[]}
      loading={false}
      error={null}
      productTypeGroups={[]}
      pending={0}
      orphaned={0}
      assigning={false}
      canCreateProductType={false}
      creatingProductType={false}
      onCreateProductType={vi.fn()}
      onAssign={vi.fn()}
    />,
  )

  expect(latestTableProps.scroll).toEqual(expect.objectContaining({ x: 900 }))
})

test('keeps the selection column compact and shows product code with its name', () => {
  render(
    <VendorMigrationTabPage
      canWrite
      rows={[
        {
          id: 'product-1010',
          vendorCode: 'VENDOR',
          vendorName: 'Vendor',
          code: 'PRODUCT_1010',
          name: "Women's Micro Rib Baby Tee",
          externalProductId: '1010',
          imageUrl: null,
          variantCount: 0,
        },
      ]}
      loading={false}
      error={null}
      productTypeGroups={[]}
      pending={1}
      orphaned={0}
      assigning={false}
      canCreateProductType={false}
      creatingProductType={false}
      onCreateProductType={vi.fn()}
      onAssign={vi.fn()}
    />,
  )

  expect((latestTableProps.rowSelection as { columnWidth?: number }).columnWidth).toBe(40)
  expect(screen.getByText("Women's Micro Rib Baby Tee")).toBeTruthy()
  expect(screen.getByText('PRODUCT_1010')).toBeTruthy()
})

test('opens one image preview and leaves missing images blank', () => {
  render(
    <VendorMigrationTabPage
      canWrite
      rows={[
        {
          id: 'product-image',
          vendorCode: 'VENDOR',
          vendorName: 'Vendor',
          code: 'IMAGE',
          name: 'With image',
          externalProductId: '1',
          imageUrl: 'https://cdn.example.test/product.jpg',
          variantCount: 0,
        },
        {
          id: 'product-empty',
          vendorCode: 'VENDOR',
          vendorName: 'Vendor',
          code: 'EMPTY',
          name: 'Without image',
          externalProductId: '2',
          imageUrl: null,
          variantCount: 0,
        },
      ]}
      loading={false}
      error={null}
      productTypeGroups={[]}
      pending={2}
      orphaned={0}
      assigning={false}
      canCreateProductType={false}
      creatingProductType={false}
      onCreateProductType={vi.fn()}
      onAssign={vi.fn()}
    />,
  )

  expect(screen.queryByText('—')).toBeNull()
  fireEvent.click(screen.getByRole('img', { name: 'With image' }))
  expect(screen.getByRole('dialog')).toBeTruthy()
})
