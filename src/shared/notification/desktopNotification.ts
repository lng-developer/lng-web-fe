export interface DesktopNotificationOptions {
  title: string
  body?: string
  icon?: string
  tag?: string
  onClick?: () => void
}

export function isDesktopNotificationSupported(): boolean {
  return typeof globalThis !== 'undefined' && 'Notification' in globalThis
}

export function getDesktopNotificationPermission(): NotificationPermission {
  if (!isDesktopNotificationSupported()) return 'denied'
  return globalThis.Notification.permission
}

export async function requestDesktopNotificationPermission(): Promise<NotificationPermission> {
  if (!isDesktopNotificationSupported()) return 'denied'
  if (
    globalThis.Notification.permission === 'granted' ||
    globalThis.Notification.permission === 'denied'
  ) {
    return globalThis.Notification.permission
  }
  try {
    return await globalThis.Notification.requestPermission()
  } catch (err) {
    console.warn('Failed to request desktop notification permission', err)
    return 'denied'
  }
}

export function showDesktopNotification(options: DesktopNotificationOptions): Notification | null {
  if (!isDesktopNotificationSupported()) return null
  if (globalThis.Notification.permission !== 'granted') return null

  try {
    const notification = new globalThis.Notification(options.title, {
      body: options.body,
      icon: options.icon ?? '/favicon.svg',
      tag: options.tag,
    })

    if (options.onClick) {
      notification.onclick = () => {
        if (typeof window !== 'undefined' && window.focus) {
          window.focus()
        }
        options.onClick?.()
        notification.close()
      }
    }

    return notification
  } catch (error) {
    console.warn('Failed to trigger desktop notification', error)
    return null
  }
}
