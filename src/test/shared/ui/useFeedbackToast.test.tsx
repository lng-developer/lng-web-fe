import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const toastSource = readFileSync(
  resolve(process.cwd(), 'src/shared/ui/useFeedbackToast.tsx'),
  'utf8',
)
const globalToastSource = readFileSync(
  resolve(process.cwd(), 'src/shared/query/GlobalMutationToastProvider.tsx'),
  'utf8',
)

describe('useFeedbackToast', () => {
  it('makes feedback toasts dismissible without removing their auto-dismiss timeout', () => {
    expect(toastSource).toMatch(/closable:\s*true[\s\S]*duration:\s*5/)
  })

  it('centers the close control inside the feedback toast', () => {
    const styles = readFileSync(
      resolve(process.cwd(), 'src/shared/ui/sharedUi.module.scss'),
      'utf8',
    )

    expect(styles).toMatch(
      /\.feedbackToastNotification\s*:global\(\.ant-notification-notice-close\)\s*\{[^}]*top:\s*50%[^}]*transform:\s*translateY\(-50%\)/s,
    )
  })

  it('uses the notification container as the toast surface so the close control stays inside it', () => {
    const styles = readFileSync(
      resolve(process.cwd(), 'src/shared/ui/sharedUi.module.scss'),
      'utf8',
    )

    expect(styles).toMatch(
      /\.feedbackToastNotification\s*\{[^}]*border-radius:\s*12px\s*!important[^}]*background:\s*var\(--ant-color-bg-container\)\s*!important/s,
    )
    expect(styles).toMatch(
      /\.feedbackToastNotification\s*:global\(\.ant-notification-notice-close\)\s*\{[^}]*position:\s*absolute/s,
    )
  })

  it('colours the notification container for error feedback so no white strip remains beside the close control', () => {
    expect(toastSource).toMatch(/styles\.feedbackToastError/)
    expect(globalToastSource).toMatch(/styles\.feedbackToastError/)

    const styles = readFileSync(
      resolve(process.cwd(), 'src/shared/ui/sharedUi.module.scss'),
      'utf8',
    )
    expect(styles).toMatch(
      /\.feedbackToastError\s*\{[^}]*background:\s*var\(--ant-color-error\)\s*!important/s,
    )
  })
})
