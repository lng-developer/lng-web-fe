import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/portal/mapping/pages/MappingWorkspacePage', () => ({
  MappingWorkspacePage: () => <div>Mapping workspace</div>,
}))

import { appRoutes } from '@/app/router/router'
import { setPermissions } from '@/shared/auth/session'

async function loadMappingRoute() {
  const workspace = appRoutes.find((route) => route.id === 'workspace')
  const route = workspace?.children?.find(({ path }) => path === 'portal/mapping')
  expect(route?.lazy).toBeTypeOf('function')
  if (!route?.lazy) throw new Error('Portal Mapping route must be lazy')
  const loaded = await (route.lazy as () => Promise<{ Component?: React.ComponentType }>)()
  if (!('Component' in loaded) || !loaded.Component)
    throw new Error('Mapping route must provide a component')
  return loaded.Component
}

describe('Portal Mapping route', () => {
  afterEach(cleanup)

  it('allows mapping readers', async () => {
    const Component = await loadMappingRoute()
    setPermissions(['MAPPING:READ'])
    render(<Component />)
    expect(screen.getByText('Mapping workspace')).toBeVisible()
  })

  it('rejects users without mapping permissions', async () => {
    const Component = await loadMappingRoute()
    setPermissions(['ORDERS:READ'])
    render(<Component />)
    expect(screen.getByText('403')).toBeVisible()
  })
})
