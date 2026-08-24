import { MemoryRouter } from 'react-router-dom'
import { cleanup, render, screen } from '@testing-library/react'
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

describe('AppSidebar', () => {
  beforeEach(() => i18n.changeLanguage('en'))
  afterEach(cleanup)

  it('renders only the contextual groups it receives', () => {
    renderSidebar([personal])

    expect(screen.getByText('Personal')).toBeVisible()
    expect(screen.queryByText('Team management')).not.toBeInTheDocument()
    expect(document.querySelector('a[href="/hr/me"]')).not.toBeNull()
  })

  it('renders personal and team groups for a manager', () => {
    renderSidebar([personal, team])

    expect(screen.getByText('Personal')).toBeVisible()
    expect(screen.getByText('Team management')).toBeVisible()
  })

  it('keeps all contextual groups expanded', () => {
    renderSidebar([personal, team, operations], 'team-approvals')

    expect(screen.getByRole('link', { name: 'Approvals' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Profile' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Employees' })).toBeVisible()
  })

  it('keeps groups visible when the route changes', () => {
    const view = renderSidebar([personal, team], 'self')

    expect(screen.getByRole('link', { name: 'Profile' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Approvals' })).toBeVisible()

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

    expect(screen.getByRole('link', { name: 'Approvals' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Profile' })).toBeVisible()
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
