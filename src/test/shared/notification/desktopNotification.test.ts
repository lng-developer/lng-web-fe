import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  getDesktopNotificationPermission,
  isDesktopNotificationSupported,
  requestDesktopNotificationPermission,
  showDesktopNotification,
} from '@/shared/notification/desktopNotification'

describe('desktopNotification', () => {
  const originalNotification = globalThis.Notification

  afterEach(() => {
    if (originalNotification) {
      globalThis.Notification = originalNotification
    } else {
      delete (globalThis as { Notification?: unknown }).Notification
    }
    vi.restoreAllMocks()
  })

  it('checks whether notification is supported when Notification does not exist', () => {
    delete (globalThis as { Notification?: unknown }).Notification
    expect(isDesktopNotificationSupported()).toBe(false)
    expect(getDesktopNotificationPermission()).toBe('denied')
  })

  it('handles permission requests properly when supported', async () => {
    const mockRequestPermission = vi.fn().mockResolvedValue('granted' as NotificationPermission)
    globalThis.Notification = {
      permission: 'default',
      requestPermission: mockRequestPermission,
    } as unknown as typeof Notification

    expect(isDesktopNotificationSupported()).toBe(true)
    expect(getDesktopNotificationPermission()).toBe('default')

    const permission = await requestDesktopNotificationPermission()
    expect(permission).toBe('granted')
    expect(mockRequestPermission).toHaveBeenCalled()
  })

  it('creates and returns a new Notification when permission is granted', () => {
    const mockNotificationInstance = {
      onclick: null as ((event: Event) => void) | null,
      close: vi.fn(),
    }
    const mockConstructor = vi.fn().mockImplementation(function (this: unknown) {
      return mockNotificationInstance
    })
    Object.assign(mockConstructor, {
      permission: 'granted',
      requestPermission: vi.fn(),
    })

    globalThis.Notification = mockConstructor as unknown as typeof Notification

    const onClick = vi.fn()
    const result = showDesktopNotification({
      title: 'Tin nhắn mới',
      body: 'Xin chào bạn',
      onClick,
    })

    expect(result).toBe(mockNotificationInstance)
    expect(mockConstructor).toHaveBeenCalledWith('Tin nhắn mới', {
      body: 'Xin chào bạn',
      icon: '/favicon.svg',
      tag: undefined,
    })

    if (result && result.onclick) {
      result.onclick({} as Event)
      expect(onClick).toHaveBeenCalled()
      expect(mockNotificationInstance.close).toHaveBeenCalled()
    }
  })

  it('returns null if permission is not granted', () => {
    const mockConstructor = vi.fn().mockImplementation(function (this: unknown) {
      return {}
    })
    Object.assign(mockConstructor, {
      permission: 'denied',
      requestPermission: vi.fn(),
    })

    globalThis.Notification = mockConstructor as unknown as typeof Notification

    const result = showDesktopNotification({
      title: 'Thông báo',
      body: 'Thử nghiệm',
    })

    expect(result).toBeNull()
    expect(mockConstructor).not.toHaveBeenCalled()
  })
})
