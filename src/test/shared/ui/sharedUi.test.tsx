import { DeleteOutlined, UserOutlined } from '@ant-design/icons'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import dayjs from 'dayjs'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  BarChart,
  BulkActionBar,
  CommandPalette,
  ConfirmDangerModal,
  DataTable,
  DateTimePicker,
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
  SearchInput,
  StatusTag,
  TableFooter,
} from '@/shared/ui'
import { serializeDateTimeValue } from '@/shared/ui/dateTimeValue'

describe('shared UI', () => {
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('updates the search field immediately and debounces expensive consumers', () => {
    vi.useFakeTimers()
    const onSearchChange = vi.fn()
    render(<SearchInput aria-label="Search staff" delay={200} onSearchChange={onSearchChange} />)

    fireEvent.change(screen.getByLabelText('Search staff'), { target: { value: 'J2501' } })

    expect(screen.getByLabelText('Search staff')).toHaveValue('J2501')
    expect(onSearchChange).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(200))
    expect(onSearchChange).toHaveBeenCalledWith('J2501')
  })

  it('does not restart debounce when the parent recreates its callback', () => {
    vi.useFakeTimers()
    const first = vi.fn()
    const latest = vi.fn()
    const view = render(<SearchInput aria-label="Search" delay={200} onSearchChange={first} />)

    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'ORDER-1' } })
    act(() => vi.advanceTimersByTime(100))
    view.rerender(<SearchInput aria-label="Search" delay={200} onSearchChange={latest} />)
    act(() => vi.advanceTimersByTime(100))

    expect(latest).toHaveBeenCalledWith('ORDER-1')
  })

  it('renders date, time, and datetime values in their own formats', () => {
    render(
      <>
        <DateTimePicker aria-label="Date" mode="date" value="2026-07-31" />
        <DateTimePicker aria-label="Time" mode="time" value="13:45:00" />
        <DateTimePicker aria-label="Date time" mode="datetime" value="2026-07-31T13:45:00" />
      </>,
    )

    expect(screen.getByLabelText('Date')).toHaveValue('31/07/2026')
    expect(screen.getByLabelText('Time')).toHaveValue('13:45')
    expect(screen.getByLabelText('Date time')).toHaveValue('31/07/2026 13:45')
  })

  it('serializes time values using the backend HH:mm contract', () => {
    expect(serializeDateTimeValue(dayjs('2026-07-31T13:45:00'), 'time')).toBe('13:45')
  })

  it('renders page context, actions, and operational status', () => {
    render(
      <>
        <PageHeader
          title="Foundation"
          description="Long page description"
          updatedAt="2026-08-04T03:00:00.000Z"
          actions={<button type="button">Refresh</button>}
        />
        <StatusTag status="operational">Operational</StatusTag>
      </>,
    )

    expect(screen.getByRole('heading', { name: 'Foundation' })).toBeVisible()
    expect(screen.getByText('Long page description')).toBeVisible()
    expect(screen.getByText(/Cập nhật lúc:/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Refresh' })).toBeVisible()
    expect(screen.getByText('Operational')).toBeVisible()
  })

  it('keeps ready and processing statuses visually distinct', () => {
    render(
      <>
        <StatusTag status="ready">Ready</StatusTag>
        <StatusTag status="processing">Submitting</StatusTag>
      </>,
    )

    expect(screen.getByText('Ready')).toHaveStyle({ color: 'var(--ant-color-info)' })
    expect(screen.getByText('Submitting')).toHaveStyle({ color: 'var(--ant-color-primary)' })
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

  it('activates clickable metric cards with Enter and Space', () => {
    const onClick = vi.fn()
    render(<MetricCard label="Blocked" value={3} onClick={onClick} />)

    const metric = screen.getByRole('button', { name: /Blocked/i })
    fireEvent.keyDown(metric, { key: 'Enter' })
    fireEvent.keyDown(metric, { key: ' ' })

    expect(onClick).toHaveBeenCalledTimes(2)
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
