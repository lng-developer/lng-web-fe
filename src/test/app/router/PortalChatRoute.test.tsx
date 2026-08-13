import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/portal/chat/pages/ChatWorkspacePage', () => ({
  ChatWorkspacePage: () => <div>Chat workspace</div>,
}))

import { appRoutes } from '@/app/router/router'

describe('Portal Chat route', () => {
  afterEach(cleanup)

  it('is lazy and available to authenticated workspace users', async () => {
    const workspace = appRoutes.find((route) => route.id === 'workspace')
    const route = workspace?.children?.find(({ path }) => path === 'portal/chat')
    if (typeof route?.lazy !== 'function') throw new Error('Chat route must be lazy')
    const loaded = await route.lazy()
    if (!('Component' in loaded) || !loaded.Component)
      throw new Error('Route component is required')

    const view = render(<loaded.Component />)
    expect(screen.getByText('Chat workspace')).toBeVisible()
    view.unmount()
  })
})
