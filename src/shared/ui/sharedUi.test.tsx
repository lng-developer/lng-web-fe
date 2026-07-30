import { DeleteOutlined, UserOutlined } from '@ant-design/icons'
import { render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
  BarChart,
  BulkActionBar,
  CommandPalette,
  ConfirmDangerModal,
  DataTable,
  DetailDrawer,
  EmptyState,
  FeedbackAlert,
  FileUpload,
  FilterBar,
  FormActions,
  LoadingState,
  MetricCard,
  PageHeader,
  PermissionGate,
  StatusTag,
  TableFooter,
} from './index'

describe('shared UI', () => {
  it('renders page hierarchy and operational status', () => {
    render(
      <>
        <PageHeader title="Foundation" />
        <StatusTag status="operational">Operational</StatusTag>
      </>,
    )

    expect(screen.getByRole('heading', { name: 'Foundation' })).toBeVisible()
    expect(screen.getByText('Operational')).toBeVisible()
  })

  it('renders accessible empty and error states', () => {
    render(
      <>
        <EmptyState title="No personnel found" />
        <FeedbackAlert type="error" title="Connection failed" action="Retry" />
      </>,
    )

    expect(screen.getByText('No personnel found')).toBeVisible()
    expect(screen.getByRole('alert')).toHaveTextContent('Connection failed')
    expect(screen.getByRole('alert')).toHaveTextContent('Retry')
  })

  it('allows a caller to style the filter control group', () => {
    render(
      <FilterBar label="Account filters" contentClassName="single-line-filters">
        <input aria-label="Search" />
      </FilterBar>,
    )

    expect(screen.getByRole('search').querySelector('.single-line-filters')).toBeInTheDocument()
  })

  it('renders table, drawer, form, loading, and permission foundations', () => {
    render(
      <>
        <DataTable
          columns={[{ dataIndex: 'name', title: 'Name' }]}
          dataSource={[{ key: 'order-1', name: 'Order 1' }]}
          rowSelection={{}}
        />
        <DetailDrawer open title="Order details" onClose={() => undefined}>
          Order content
        </DetailDrawer>
        <FormActions dirty={false} submitLabel="Save" cancelLabel="Cancel" />
        <LoadingState variant="table" />
        <PermissionGate permissions={['orders.read']} required="orders.export" mode="disable">
          <button type="button">Export</button>
        </PermissionGate>
      </>,
    )

    expect(screen.getByText('Order 1')).toBeVisible()
    expect(screen.getByRole('dialog')).toHaveTextContent('Order details')
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled()
  })

  it('renders summary, pagination, and destructive confirmation patterns', async () => {
    render(
      <>
        <MetricCard
          label="Total assets"
          value="1,284"
          icon={<UserOutlined aria-label="Account metric" />}
        />
        <TableFooter from={21} to={40} total={126} pageSize={20} />
        <ConfirmDangerModal
          open
          title="Delete role?"
          description="This cannot be undone."
          confirmLabel="Delete role"
          confirmIcon={<DeleteOutlined aria-label="Delete action icon" />}
          onConfirm={() => undefined}
          onCancel={() => undefined}
        />
      </>,
    )

    expect(screen.getByText('Total assets')).toBeVisible()
    expect(screen.getByText('1,284')).toBeVisible()
    expect(screen.getByLabelText('Account metric')).toBeVisible()
    expect(screen.getByText('Showing 21-40 of 126')).toBeVisible()
    const dialog = screen
      .getAllByRole('dialog')
      .find((candidate) => within(candidate).queryByText('Delete role?'))
    expect(dialog).toBeDefined()
    await waitFor(() => {
      expect(within(dialog!).getByText('Delete role?')).toBeVisible()
      expect(within(dialog!).getByRole('button', { name: /Delete role/ })).toBeVisible()
      expect(within(dialog!).getByLabelText('Delete action icon')).toBeVisible()
    })
  })

  it('renders upload, bulk action, command palette, and chart foundations', () => {
    render(
      <>
        <FileUpload title="Upload files" description="Drop files here" />
        <BulkActionBar selectedCount={2} onClear={() => undefined}>
          <button type="button">Archive</button>
        </BulkActionBar>
        <CommandPalette
          open
          onOpenChange={() => undefined}
          commands={[{ key: 'orders', label: 'Open orders', onSelect: () => undefined }]}
        />
        <BarChart data={[{ label: 'Mon', value: 42 }]} ariaLabel="Daily orders" />
      </>,
    )

    expect(screen.getByText('Upload files')).toBeVisible()
    expect(screen.getByText('2 selected')).toBeVisible()
    expect(screen.getByText('Open orders')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Daily orders' })).toBeVisible()
  })
})
