import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/portal/shipments/pages/ShipmentWorkbenchPage', () => ({
  ShipmentWorkbenchPage: () => <div>Shipment workbench</div>,
}))

import { appRoutes } from '@/app/router/router'
import { setPermissions } from '@/shared/auth/session'

async function loadRoute() {
  const workspace = appRoutes.find((route) => route.id === 'workspace')
  const route = workspace?.children?.find(({ path }) => path === 'portal/shipments')
  if (typeof route?.lazy !== 'function') throw new Error('Shipment route must be lazy')
  const loaded = await route.lazy()
  if (!('Component' in loaded) || !loaded.Component) throw new Error('Route component is required')
  return loaded.Component
}

describe('Portal Shipment route', () => {
  afterEach(cleanup)

  it('allows read or write permission and rejects unrelated permissions', async () => {
    const Component = await loadRoute()
    for (const permission of ['SHIPMENTS:READ', 'SHIPMENTS:WRITE']) {
      setPermissions([permission])
      const view = render(<Component />)
      expect(screen.getByText('Shipment workbench')).toBeVisible()
      view.unmount()
    }
    setPermissions(['ORDERS:READ'])
    render(<Component />)
    expect(screen.getByText('403')).toBeVisible()
  })
})
