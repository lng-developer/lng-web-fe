import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/portal/orders/pages/OrderWorkbenchPage', () => ({
  OrderWorkbenchPage: () => <div>Order workbench</div>,
}))

import { appRoutes } from '@/app/router/router'
import { setPermissions } from '@/shared/auth/session'

describe('Portal Order route', () => {
  afterEach(cleanup)

  it('is lazy and permission gated', async () => {
    const workspace = appRoutes.find((route) => route.id === 'workspace')
    const route = workspace?.children?.find(({ path }) => path === 'portal/orders')
    if (typeof route?.lazy !== 'function') throw new Error('Order route must be lazy')
    const loaded = await route.lazy()
    if (!('Component' in loaded) || !loaded.Component)
      throw new Error('Route component is required')

    setPermissions(['ORDERS:READ'])
    const view = render(<loaded.Component />)
    expect(screen.getByText('Order workbench')).toBeVisible()
    view.unmount()

    setPermissions(['SHOPS:READ'])
    render(<loaded.Component />)
    expect(screen.getByText('403')).toBeVisible()
  })
})
