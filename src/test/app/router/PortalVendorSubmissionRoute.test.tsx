import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/portal/vendor-submissions/pages/VendorSubmissionWorkbenchPage', () => ({
  VendorSubmissionWorkbenchPage: () => <div>Vendor submission workbench</div>,
}))

import { appRoutes } from '@/app/router/router'
import { setPermissions } from '@/shared/auth/session'

async function loadRoute() {
  const workspace = appRoutes.find((route) => route.id === 'workspace')
  const route = workspace?.children?.find(({ path }) => path === 'portal/vendor-submissions')
  if (typeof route?.lazy !== 'function') throw new Error('Vendor submission route must be lazy')
  const loaded = await route.lazy()
  if (!('Component' in loaded) || !loaded.Component) throw new Error('Route component is required')
  return loaded.Component
}

describe('Portal Vendor Submission route', () => {
  afterEach(cleanup)

  it('allows read permission and rejects unrelated permissions', async () => {
    const Component = await loadRoute()
    setPermissions(['VENDOR_SUBMISSIONS:READ'])
    const view = render(<Component />)
    expect(screen.getByText('Vendor submission workbench')).toBeVisible()

    view.unmount()
    setPermissions(['ORDERS:READ'])
    render(<Component />)
    expect(screen.getByText('403')).toBeVisible()
  })
})
