import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/portal/vendors/pages/VendorWorkspacePage', () => ({
  VendorWorkspacePage: () => <div>Vendor workspace</div>,
}))

import { appRoutes } from '@/app/router/router'
import { setGlobalPermissions, setPermissions } from '@/shared/auth/session'

async function loadVendorRoute() {
  const workspace = appRoutes.find((route) => route.id === 'workspace')
  const route = workspace?.children?.find(({ path }) => path === 'portal/vendors')
  const lazy = route?.lazy
  expect(lazy).toBeTypeOf('function')
  if (typeof lazy !== 'function') throw new Error('Portal Vendor route must be lazy')
  const loaded = await lazy()
  if (!('Component' in loaded) || !loaded.Component)
    throw new Error('Vendor route must provide a component')
  return loaded.Component
}

describe('Portal Vendor route', () => {
  afterEach(cleanup)

  it('rejects a scoped-only Vendor permission', async () => {
    const Component = await loadVendorRoute()
    setPermissions(['VENDORS:READ'])
    setGlobalPermissions([])
    render(<Component />)
    expect(screen.getByText('403')).toBeVisible()
    expect(screen.queryByText('Vendor workspace')).not.toBeInTheDocument()
  })

  it('allows a global Vendor permission', async () => {
    const Component = await loadVendorRoute()
    setPermissions(['VENDORS:READ'])
    setGlobalPermissions(['VENDORS:READ'])
    render(<Component />)
    expect(screen.getByText('Vendor workspace')).toBeVisible()
  })
})
