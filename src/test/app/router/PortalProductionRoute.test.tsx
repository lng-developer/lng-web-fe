import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/portal/production/pages/ProductionWorkbenchPage', () => ({
  ProductionWorkbenchPage: () => <div>Production workbench</div>,
}))

import { appRoutes } from '@/app/router/router'
import { setPermissions } from '@/shared/auth/session'

async function loadRoute() {
  const workspace = appRoutes.find((route) => route.id === 'workspace')
  const route = workspace?.children?.find(({ path }) => path === 'portal/production')
  if (typeof route?.lazy !== 'function') throw new Error('Production route must be lazy')
  const loaded = await route.lazy()
  if (!('Component' in loaded) || !loaded.Component) throw new Error('Route component is required')
  return loaded.Component
}

describe('Portal Production route', () => {
  afterEach(cleanup)
  it('allows production and design permissions', async () => {
    const Component = await loadRoute()
    for (const permission of [
      'PRODUCTION:READ',
      'PRODUCTION:WRITE',
      'DESIGN:WORK',
      'DESIGN:REVIEW',
    ]) {
      setPermissions([permission])
      const view = render(<Component />)
      expect(screen.getByText('Production workbench')).toBeVisible()
      view.unmount()
    }
    setPermissions(['SHIPMENTS:READ'])
    render(<Component />)
    expect(screen.getByText('403')).toBeVisible()
  })
})
