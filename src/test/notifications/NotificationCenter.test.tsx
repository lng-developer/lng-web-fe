import { MemoryRouter, useLocation } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AppProviders } from '@/app/providers/AppProviders'
import { NotificationCenter } from '@/features/notifications/components/NotificationCenter'
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/features/notifications/api/notificationApi'
import { useResourceSelection } from '@/shared/ui'
import i18n from '@/shared/i18n/i18n'
import { queryClient } from '@/shared/query/queryClient'

vi.mock('@/features/notifications/api/notificationApi', () => ({
  listNotifications: vi.fn(),
  getUnreadCount: vi.fn().mockResolvedValue({ unreadCount: 1 }),
  markNotificationRead: vi.fn().mockResolvedValue({}),
  markAllNotificationsRead: vi.fn().mockResolvedValue({}),
}))
const item = {
  id: 'notification-1',
  type: 'SHIPMENT_EXCEPTION',
  title: 'Shipment needs attention',
  message: 'Review shipment',
  relatedResource: { type: 'shipment', id: 'shipment-1' },
  readAt: null,
  createdAt: '2026-10-14T00:00:00Z',
  updatedAt: '2026-10-14T00:00:00Z',
}
function Location() {
  const loc = useLocation()
  return <output>{loc.pathname + loc.search}</output>
}
beforeEach(async () => {
  vi.clearAllMocks()
  queryClient.clear()
  await i18n.changeLanguage('en')
  vi.mocked(listNotifications).mockResolvedValue({
    items: [item],
    pagination: { page: 1, limit: 8, total: 1 },
  })
})
afterEach(cleanup)
it('navigates to the exact resource and marks read when clicking the notification', async () => {
  render(
    <MemoryRouter>
      <AppProviders>
        <NotificationCenter />
        <Location />
      </AppProviders>
    </MemoryRouter>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Open notifications' }))
  fireEvent.click(await screen.findByText('Shipment needs attention'))
  expect(screen.getByText('/portal/shipments?resourceId=shipment-1')).toBeInTheDocument()
  await waitFor(() =>
    expect(markNotificationRead).toHaveBeenCalledWith('notification-1', expect.any(Object)),
  )
})
it('keeps mark-read available independently of navigation', async () => {
  render(
    <MemoryRouter>
      <AppProviders>
        <NotificationCenter />
      </AppProviders>
    </MemoryRouter>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Open notifications' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Mark as read' }))
  await waitFor(() =>
    expect(markNotificationRead).toHaveBeenCalledWith('notification-1', expect.any(Object)),
  )
})
it('marks all notifications read when clicking mark all read button', async () => {
  render(
    <MemoryRouter>
      <AppProviders>
        <NotificationCenter />
      </AppProviders>
    </MemoryRouter>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Open notifications' }))
  const markAllBtn = await screen.findByRole('button', { name: 'Mark all as read' })
  await waitFor(() => expect(markAllBtn).not.toBeDisabled())
  fireEvent.click(markAllBtn)
  await waitFor(() => expect(markAllNotificationsRead).toHaveBeenCalled())
})
it('selects URL resources and closes them without dropping unrelated filters', () => {
  function Selection() {
    const [selected, select] = useResourceSelection()
    return (
      <>
        <span>{selected || 'closed'}</span>
        <button onClick={() => select(undefined)}>Close</button>
        <Location />
      </>
    )
  }
  render(
    <MemoryRouter initialEntries={['/portal/shipments?resourceId=shipment-9&status=EXCEPTION']}>
      <Selection />
    </MemoryRouter>,
  )
  expect(screen.getByText('shipment-9')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Close' }))
  expect(screen.getByText('closed')).toBeInTheDocument()
  expect(screen.getByText('/portal/shipments?status=EXCEPTION')).toBeInTheDocument()
})
