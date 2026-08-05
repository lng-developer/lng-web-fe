import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { PortalPageBoundary } from '@/features/portal/components/PortalPageBoundary'
import { setGlobalPermissions, setPermissions } from '@/shared/auth/session'

describe('PortalPageBoundary', () => {
  afterEach(cleanup)

  it('renders children when the restored session grants a required permission', () => {
    setPermissions(['SHOPS:READ'])

    render(
      <PortalPageBoundary anyOf={['SHOPS:READ']}>
        <div>Shop workspace</div>
      </PortalPageBoundary>,
    )

    expect(screen.getByText('Shop workspace')).toBeVisible()
  })

  it('renders a 403 result without a required permission', () => {
    setPermissions([])

    render(
      <PortalPageBoundary anyOf={['SHOPS:READ']}>
        <div>Shop workspace</div>
      </PortalPageBoundary>,
    )

    expect(screen.getByText('403')).toBeVisible()
    expect(screen.queryByText('Shop workspace')).not.toBeInTheDocument()
  })

  it('requires a global grant when the route declares global-only authorization', () => {
    setPermissions(['VENDORS:READ'])
    setGlobalPermissions([])

    render(
      <PortalPageBoundary anyOf={['VENDORS:READ']} globalOnly>
        <div>Vendor workspace</div>
      </PortalPageBoundary>,
    )

    expect(screen.getByText('403')).toBeVisible()
    expect(screen.queryByText('Vendor workspace')).not.toBeInTheDocument()
  })

  it('allows a global grant through a global-only route boundary', () => {
    setPermissions(['VENDORS:READ'])
    setGlobalPermissions(['VENDORS:READ'])

    render(
      <PortalPageBoundary anyOf={['VENDORS:READ']} globalOnly>
        <div>Vendor workspace</div>
      </PortalPageBoundary>,
    )

    expect(screen.getByText('Vendor workspace')).toBeVisible()
  })
})
