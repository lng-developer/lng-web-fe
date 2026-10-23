import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const openNotification = vi.hoisted(() => vi.fn())

vi.mock('antd', () => ({
  App: {
    useApp: () => ({ notification: { open: openNotification } }),
  },
}))

import { useFeedbackToast } from '@/shared/ui/useFeedbackToast'

describe('useFeedbackToast', () => {
  beforeEach(() => {
    openNotification.mockReset()
  })

  it('makes feedback toasts dismissible without removing their auto-dismiss timeout', () => {
    const { result } = renderHook(() => useFeedbackToast())

    result.current('error', 'Save failed')

    expect(openNotification).toHaveBeenCalledWith(
      expect.objectContaining({ closable: true, duration: 5 }),
    )
  })

  it('centers the close control inside the feedback toast', () => {
    const styles = readFileSync(resolve(process.cwd(), 'src/shared/ui/sharedUi.module.scss'), 'utf8')

    expect(styles).toMatch(
      /\.feedbackToastNotification\s*:global\(\.ant-notification-notice-close\)\s*\{[^}]*top:\s*50%[^}]*transform:\s*translateY\(-50%\)/s,
    )
  })

  it('extends the feedback surface beneath the close control', () => {
    const styles = readFileSync(resolve(process.cwd(), 'src/shared/ui/sharedUi.module.scss'), 'utf8')

    expect(styles).toMatch(/\.feedbackAlert\s*\{[^}]*width:\s*100%/s)
  })
})
