import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/portal/design/pages/DesignWorkbenchPage', () => ({
  DesignWorkbenchPage: () => <div>Design workbench</div>,
}))
vi.mock('@/features/portal/design/pages/PsdFileWorkspacePage', () => ({
  PsdFileWorkspacePage: () => <div>PSD files</div>,
}))
vi.mock('@/features/portal/design/pages/PsdTasksPage', () => ({
  PsdTasksPage: () => <div>PSD requests</div>,
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
  it('allows every Design workflow permission to read PSD files', async () => {
    const workspace = appRoutes.find(({ id }) => id === 'workspace')
    const route = workspace?.children?.find(({ path }) => path === 'portal/design/files')
    if (typeof route?.lazy !== 'function') throw new Error('PSD files route must be lazy')
    const loaded = await route.lazy()
    if (!('Component' in loaded) || !loaded.Component)
      throw new Error('Route component is required')
    for (const permission of ['DESIGN:READ', 'DESIGN:WRITE', 'DESIGN:WORK', 'DESIGN:REVIEW']) {
      setPermissions([permission])
      const view = render(<loaded.Component />)
      expect(screen.getByText('PSD files')).toBeVisible()
      view.unmount()
    }
  })

  it('allows the narrow requester permission into the PSD request route only', async () => {
    const workspace = appRoutes.find(({ id }) => id === 'workspace')
    const route = workspace?.children?.find(({ path }) => path === 'portal/design/psd-tasks')
    if (typeof route?.lazy !== 'function') throw new Error('PSD request route must be lazy')
    const loaded = await route.lazy()
    if (!('Component' in loaded) || !loaded.Component)
      throw new Error('Route component is required')
    setPermissions(['DESIGN:PSD_REQUEST'])
    render(<loaded.Component />)
    expect(screen.getByText('PSD requests')).toBeVisible()
  })
})
