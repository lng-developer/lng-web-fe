import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/portal/work-scores/pages/WorkScoreWorkbenchPage', () => ({
  WorkScoreWorkbenchPage: () => <div>Work Score workbench</div>,
}))

import { appRoutes } from '@/app/router/router'
import { setPermissions } from '@/shared/auth/session'

describe('Portal Work Score route', () => {
  afterEach(cleanup)

  it('allows score readers, adjusters, and own Design workers', async () => {
    const workspace = appRoutes.find((route) => route.id === 'workspace')
    const route = workspace?.children?.find(({ path }) => path === 'portal/work-scores')
    if (typeof route?.lazy !== 'function') throw new Error('Work Score route must be lazy')
    const loaded = await route.lazy()
    if (!('Component' in loaded) || !loaded.Component)
      throw new Error('Route component is required')
    for (const permission of ['WORK_SCORES:READ', 'WORK_SCORES:ADJUST', 'DESIGN:WORK']) {
      setPermissions([permission])
      const view = render(<loaded.Component />)
      expect(screen.getByText('Work Score workbench')).toBeVisible()
      view.unmount()
    }
    setPermissions(['ORDERS:READ'])
    render(<loaded.Component />)
    expect(screen.getByText('403')).toBeVisible()
  })
})
