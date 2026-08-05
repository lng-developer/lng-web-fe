import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/portal/integrations/pages/IntegrationWorkbenchPage', () => ({
  IntegrationWorkbenchPage: () => <div>Integration workbench</div>,
}))

import { appRoutes } from '@/app/router/router'
import { setPermissions } from '@/shared/auth/session'

async function loadIntegrationRoute() {
  const workspace = appRoutes.find((route) => route.id === 'workspace')
  const route = workspace?.children?.find(({ path }) => path === 'portal/integrations')
  const lazy = route?.lazy
  expect(lazy).toBeTypeOf('function')
  if (typeof lazy !== 'function') throw new Error('Portal Integration route must be lazy')
  const loaded = await lazy()
  if (!('Component' in loaded) || !loaded.Component) {
    throw new Error('Portal Integration lazy route must provide a component')
  }
  return loaded.Component
}

describe('Portal Integration route', () => {
  afterEach(cleanup)

  it.each(['ORDERS:READ', 'ORDERS:WRITE'])(
    'allows %s through the lazy route boundary',
    async (permission) => {
      const Component = await loadIntegrationRoute()
      setPermissions([permission])

      render(<Component />)

      expect(screen.getByText('Integration workbench')).toBeVisible()
    },
  )

  it('renders forbidden without an order permission', async () => {
    const Component = await loadIntegrationRoute()
    setPermissions(['SHOPS:READ'])

    render(<Component />)

    expect(screen.getByText('403')).toBeVisible()
    expect(screen.queryByText('Integration workbench')).not.toBeInTheDocument()
  })
})
