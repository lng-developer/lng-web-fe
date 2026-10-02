import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/organization/pages/OrganizationPage', () => ({
  OrganizationPage: () => <div>Organization workspace</div>,
}))

import { appRoutes } from '@/app/router/router'
import { setGlobalPermissions, setPermissions, setRoles } from '@/shared/auth/session'

async function loadOrganizationRoute() {
  const workspace = appRoutes.find((route) => route.id === 'workspace')
  const route = workspace?.children?.find(({ path }) => path === 'organization')
  if (typeof route?.lazy !== 'function') throw new Error('Organization route must be lazy')
  const loaded = await route.lazy()
  if (!('Component' in loaded) || !loaded.Component)
    throw new Error('Organization route must provide a component')
  return loaded.Component
}

describe('Organization route', () => {
  afterEach(() => {
    cleanup()
    setRoles([])
    setPermissions([])
    setGlobalPermissions([])
  })

  it('rejects users without an organization permission', async () => {
    const Component = await loadOrganizationRoute()

    render(<Component />)

    expect(screen.getByText('403')).toBeVisible()
    expect(screen.queryByText('Organization workspace')).not.toBeInTheDocument()
  })

  it('allows users with an organization read permission', async () => {
    const Component = await loadOrganizationRoute()
    setPermissions(['DEPARTMENTS:READ'])
    setGlobalPermissions(['DEPARTMENTS:READ'])

    render(<Component />)

    expect(screen.getByText('Organization workspace')).toBeVisible()
  })
})
