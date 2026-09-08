import { MemoryRouter } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { NavigationGroup } from '@/app/layout/appNavigation'
import { AppSidebar } from '@/app/layout/AppSidebar'
import { AppProviders } from '@/app/providers/AppProviders'
import i18n from '@/shared/i18n/i18n'

const personal: NavigationGroup = {
  key: 'personal',
  labelKey: 'shell.groups.personal',
  items: [
    { key: 'self', path: '/hr/me', labelKey: 'hrOperations.navigation.overview' },
    { key: 'self-profile', path: '/hr/me/profile', labelKey: 'hrOperations.navigation.profile' },
  ],
}
const team: NavigationGroup = {
  key: 'team',
  labelKey: 'shell.groups.team',
  items: [
    { key: 'team', path: '/hr/team', labelKey: 'hrOperations.navigation.overview' },
    {
      key: 'team-approvals',
      path: '/hr/team/approvals',
      labelKey: 'hrOperations.navigation.approvals',
    },
  ],
}
const operations: NavigationGroup = {
  key: 'operations',
  labelKey: 'shell.groups.hrOperations',
  items: [
    { key: 'operations', path: '/hr/operations', labelKey: 'hrOperations.navigation.overview' },
    {
      key: 'operations-employees',
      path: '/hr/operations/employees',
      labelKey: 'hrOperations.navigation.employees',
    },
  ],
}
const dashboard: NavigationGroup = {
  key: 'dashboard',
  labelKey: 'shell.navigation.operationsDashboard',
  standalone: true,
  items: [
    {
      key: 'operations-dashboard',
      path: '/operations-dashboard',
      labelKey: 'shell.navigation.operationsDashboard',
    },
  ],
}

describe('AppSidebar', () => {
  beforeEach(() => i18n.changeLanguage('en'))
  afterEach(cleanup)

  it('renders only the contextual groups it receives', () => {
    renderSidebar([personal])

    expect(screen.getByText('Personal')).toBeVisible()
    expect(screen.queryByText('Team management')).not.toBeInTheDocument()
    expect(document.querySelector('a[href="/hr/me"]')).not.toBeNull()
  })

  it('shows Dashboard with a home icon', () => {
    renderSidebar([dashboard], 'operations-dashboard')

    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    expect(document.querySelector('.anticon-home')).not.toBeNull()
  })

  it('renders personal and team groups for a manager', () => {
    renderSidebar([personal, team])

    expect(screen.getByText('Personal')).toBeVisible()
    expect(screen.getByText('Team management')).toBeVisible()
  })

  it('expands the group that owns the active route', async () => {
    renderSidebar([personal, team, operations], 'team-approvals')

    await waitFor(() => expect(screen.getByRole('link', { name: 'Approvals' })).toBeVisible())
    expect(screen.queryByRole('link', { name: 'Profile' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Employees' })).not.toBeInTheDocument()
  })

  it('keeps groups visible when the route changes', async () => {
    const view = renderSidebar([personal, team], 'self')

    await waitFor(() => expect(screen.getByRole('link', { name: 'Profile' })).toBeVisible())
    expect(screen.queryByRole('link', { name: 'Approvals' })).not.toBeInTheDocument()

    view.rerender(
      <MemoryRouter initialEntries={['/hr/team/approvals']}>
        <AppProviders>
          <AppSidebar
            coreLabel="HR"
            groups={[personal, team]}
            selectedKey="team-approvals"
            navigationSearch=""
            collapsed={false}
            onCollapsedChange={() => undefined}
          />
        </AppProviders>
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByRole('link', { name: 'Approvals' })).toBeVisible())
    expect(screen.queryByRole('link', { name: 'Profile' })).not.toBeInTheDocument()
  })

  it('uses the legacy menu panel width when expanded', () => {
    renderSidebar([personal])

    expect(document.querySelector('.ant-layout-sider')).toHaveStyle({
      flex: '0 0 202px',
      maxWidth: '202px',
      minWidth: '202px',
      width: '202px',
    })
  })

  it('renders the legacy system identity above the navigation', () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <AppSidebar
            accountLabel="Ngô Văn Hiếu"
            collapsed={false}
            coreLabel="Portal"
            groups={[personal]}
            navigationSearch=""
          />
        </AppProviders>
      </MemoryRouter>,
    )

    expect(screen.getByText('LNG System')).toBeVisible()
    expect(screen.getByText('Ngô Văn Hiếu')).toBeVisible()
  })
})

function renderSidebar(groups: NavigationGroup[], selectedKey = 'self') {
  return render(
    <MemoryRouter initialEntries={['/hr/me']}>
      <AppProviders>
        <AppSidebar
          coreLabel="HR"
          groups={groups}
          navigationSearch=""
          selectedKey={selectedKey}
          collapsed={false}
          onCollapsedChange={() => undefined}
        />
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('legacy AppSidebar interactions', () => {
  it('keeps a legacy menu section closed until the operator opens it', () => {
    render(
      <AppProviders>
        <MemoryRouter>
          <AppSidebar
            accountLabel="Ngô Văn Hiếu"
            collapsed={false}
            coreLabel="Portal"
            groups={[
              {
                key: 'listing',
                labelKey: 'shell.groups.legacyListing',
                items: [
                  {
                    key: 'catalog',
                    path: '/portal/catalog',
                    labelKey: 'shell.navigation.catalog',
                  },
                ],
              },
            ]}
            navigationSearch=""
          />
        </MemoryRouter>
      </AppProviders>,
    )

    expect(screen.queryByRole('link', { name: 'Catalog' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('Listing'))

    expect(screen.getByRole('link', { name: 'Catalog' })).toHaveAttribute('href', '/portal/catalog')
  })
})
