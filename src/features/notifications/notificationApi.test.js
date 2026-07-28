import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildUnreadCountQueryOptions,
  fetchNotificationInbox,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  navigateToNotification,
} from './api/notificationApi.js'

describe('notification API adapters', () => {
  it('returns unread count from the shared API response', async () => {
    const count = await fetchUnreadCount(async (path) => {
      assert.equal(path, '/api/notifications/unread-count')
      return { data: { unreadCount: 2 } }
    }, '/api/notifications/unread-count')

    assert.equal(count, 2)
  })

  it('keeps unread notifications first and newest within each read state', async () => {
    const result = await fetchNotificationInbox(async (path) => {
      assert.equal(path, '/api/notifications')
      return {
        data: {
          items: [
            {
              id: 'read-new',
              readAt: '2026-07-27T09:00:00.000Z',
              createdAt: '2026-07-27T09:00:00.000Z',
            },
            { id: 'unread-old', readAt: null, createdAt: '2026-07-27T07:00:00.000Z' },
            { id: 'unread-new', readAt: null, createdAt: '2026-07-27T10:00:00.000Z' },
          ],
          pagination: { page: 1, limit: 20, total: 3 },
        },
      }
    }, '/api/notifications')

    assert.deepEqual(
      result.items.map(({ id }) => id),
      ['unread-new', 'unread-old', 'read-new'],
    )
  })

  it('polls every minute only while authenticated', () => {
    assert.deepEqual(buildUnreadCountQueryOptions(true), {
      enabled: true,
      refetchInterval: 60_000,
    })
    assert.deepEqual(buildUnreadCountQueryOptions(false), {
      enabled: false,
      refetchInterval: false,
    })
  })

  it('navigates only to a server-provided internal route', () => {
    const visited = []
    const navigate = (route) => visited.push(route)

    assert.equal(
      navigateToNotification({ internalRoute: '/hr/requests?status=pending' }, navigate),
      true,
    )
    assert.equal(navigateToNotification({ internalRoute: 'https://example.com' }, navigate), false)
    assert.equal(navigateToNotification({ internalRoute: '//example.com/hr' }, navigate), false)
    assert.equal(
      navigateToNotification({ relatedResource: { type: 'leaveRequest' } }, navigate),
      false,
    )
    assert.deepEqual(visited, ['/hr/requests?status=pending'])
  })

  it('uses recipient-owned read endpoints', async () => {
    const calls = []
    const patch = async (path) => {
      calls.push(path)
      return { data: { id: 'notification-1', readAt: '2026-07-27T10:00:00.000Z' } }
    }

    const notification = await markNotificationRead(patch, '/api/notifications/notification-1/read')
    await markAllNotificationsRead(patch, '/api/notifications/read-all')

    assert.equal(notification.id, 'notification-1')
    assert.deepEqual(calls, [
      '/api/notifications/notification-1/read',
      '/api/notifications/read-all',
    ])
  })
})
