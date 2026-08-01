import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/portal/design/pages/DesignWorkbenchPage', () => ({
  DesignWorkbenchPage: () => <div>Design workbench</div>,
}))

import { appRoutes } from '@/app/router/router'
import { setPermissions } from '@/shared/auth/session'

describe('Portal Design route', () => {
  afterEach(cleanup)
  it('allows every Design workflow permission', async () => {
    const workspace = appRoutes.find(({ id }) => id === 'workspace')
    const route = workspace?.children?.find(({ path }) => path === 'portal/design')
    if (typeof route?.lazy !== 'function') throw new Error('Design route must be lazy')
    const loaded = await route.lazy()
    if (!('Component' in loaded) || !loaded.Component)
      throw new Error('Route component is required')
    for (const permission of ['DESIGN:READ', 'DESIGN:WRITE', 'DESIGN:WORK', 'DESIGN:REVIEW']) {
      setPermissions([permission])
      const view = render(<loaded.Component />)
      expect(screen.getByText('Design workbench')).toBeVisible()
      view.unmount()
    }
  })
})
