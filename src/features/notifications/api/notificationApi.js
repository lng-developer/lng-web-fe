const POLL_INTERVAL_MS = 60_000

function unwrapData(response) {
  return response?.data ?? response
}

function createdAtValue(notification) {
  const value = Date.parse(notification?.createdAt)
  return Number.isNaN(value) ? 0 : value
}

export function buildUnreadCountQueryOptions(authenticated) {
  return {
    enabled: Boolean(authenticated),
    refetchInterval: authenticated ? POLL_INTERVAL_MS : false,
  }
}

export async function fetchUnreadCount(get, endpoint) {
  const payload = unwrapData(await get(endpoint))
  return Number(payload?.unreadCount) || 0
}

export async function fetchNotificationInbox(get, endpoint) {
  const payload = unwrapData(await get(endpoint)) ?? {}
  const items = [...(payload.items ?? [])].sort((left, right) => {
    const readOrder = Number(Boolean(left.readAt)) - Number(Boolean(right.readAt))
    return readOrder || createdAtValue(right) - createdAtValue(left)
  })

  return { ...payload, items }
}

export async function markNotificationRead(patch, endpoint) {
  return unwrapData(await patch(endpoint))
}

export async function markAllNotificationsRead(patch, endpoint) {
  return unwrapData(await patch(endpoint))
}

export function getInternalNotificationRoute(notification) {
  const route = notification?.internalRoute
  if (typeof route !== 'string' || !route.startsWith('/') || route.startsWith('//')) return null

  const parsed = new URL(route, 'https://lng.internal')
  return parsed.origin === 'https://lng.internal'
    ? `${parsed.pathname}${parsed.search}${parsed.hash}`
    : null
}

export function navigateToNotification(notification, navigate) {
  const route = getInternalNotificationRoute(notification)
  if (!route) return false

  navigate(route)
  return true
}
