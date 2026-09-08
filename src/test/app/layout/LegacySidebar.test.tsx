import { MemoryRouter } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { LegacySidebar } from '@/app/layout/LegacySidebar'
import { AppProviders } from '@/app/providers/AppProviders'
import i18n from '@/shared/i18n/i18n'

describe('LegacySidebar', () => {
  beforeEach(() => i18n.changeLanguage('en'))
  afterEach(cleanup)

  it('ports the legacy Sales menu labels and its expanded 52 + 202 pixel layout', async () => {
    render(
      <MemoryRouter initialEntries={['/portal/team-tasks']}>
        <AppProviders>
          <LegacySidebar collapsed={false} onCollapsedChange={() => undefined} />
        </AppProviders>
      </MemoryRouter>,
    )

    expect(screen.getByText('LNG System')).toBeVisible()
    expect(screen.getByText('Ngô Văn Hiếu')).toBeVisible()
    const menuLabels = [
      'Orders',
      'Team Tasks',
      'Listing',
      'Cost Centers',
      'Reports',
      'Monitoring',
      'Configuration',
    ]
    menuLabels.forEach((label) => {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    })
    expect(document.querySelector('.ant-layout-sider')).toHaveStyle({ width: '202px' })

    fireEvent.click(screen.getByText('Orders'))
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Amazon' })).toHaveAttribute(
        'href',
        '/portal/orders?salesChannelCode=amazon',
      ),
    )

    fireEvent.click(screen.getAllByText('Cost Centers').at(-1)!)
    const costCenterChildren = ['Config', 'Product Types', 'Mapping', 'Group Standards']
    await waitFor(() => {
      costCenterChildren.forEach((label) => {
        expect(screen.getByText(label)).toBeVisible()
      })
    })

    fireEvent.click(screen.getByRole('button', { name: 'Fulfillment' }))
    expect(screen.getByText('Scale')).toBeVisible()
    expect(screen.getByText('QC')).toBeVisible()
    expect(screen.getByText('Working Status')).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Design' }))
    expect(screen.getByText('Idea Tasks')).toBeVisible()
    expect(screen.getByText('Points Dashboard')).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Vendor' }))
    expect(screen.getByText('List Vendor')).toBeVisible()
    expect(screen.getByText('Store Fulfill')).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Extensions' }))
    expect(screen.getByText('Manage Clients')).toBeVisible()
    expect(screen.getByText('Check Tracking')).toBeVisible()
  })

  it('keeps HR and Setting launchers at the bottom rail and renders their existing navigation', async () => {
    render(
      <MemoryRouter initialEntries={['/portal/team-tasks']}>
        <AppProviders>
          <LegacySidebar
            collapsed={false}
            onCollapsedChange={() => undefined}
            bottomMenus={{
              hr: [
                {
                  key: 'personal',
                  labelKey: 'shell.groups.personal',
                  items: [{ key: 'self', path: '/hr/me', labelKey: 'shell.navigation.myDay' }],
                },
              ],
              system: [
                {
                  key: 'configuration',
                  labelKey: 'shell.groups.legacyConfiguration',
                  items: [
                    {
                      key: 'accounts',
                      path: '/auth/accounts',
                      labelKey: 'shell.navigation.accounts',
                    },
                  ],
                },
              ],
            }}
          />
        </AppProviders>
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: 'HR' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Setting' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'HR' }).querySelector('.anticon-team')).toBeTruthy()
    expect(
      screen.getByRole('button', { name: 'Setting' }).querySelector('.anticon-setting'),
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'HR' }))
    expect(screen.getByText('Personal')).toBeVisible()
    expect(
      screen.getByText('Personal').closest('[role="menuitem"]')?.querySelector('.anticon-user'),
    ).toBeTruthy()
    fireEvent.click(screen.getByText('Personal'))
    await waitFor(() => expect(screen.getByText('My day')).toBeVisible())

    fireEvent.click(screen.getByRole('button', { name: 'Setting' }))
    expect(screen.getByText('Configuration')).toBeVisible()
    expect(
      screen
        .getByText('Configuration')
        .closest('[role="menuitem"]')
        ?.querySelector('.anticon-setting'),
    ).toBeTruthy()
    fireEvent.click(screen.getByText('Configuration'))
    await waitFor(() => expect(screen.getByText('Accounts')).toBeVisible())
  })

  it('marks the selected sales-channel link active when its query is in the URL', async () => {
    render(
      <MemoryRouter initialEntries={['/portal/orders?salesChannelCode=amazon']}>
        <AppProviders>
          <LegacySidebar collapsed={false} onCollapsedChange={() => undefined} />
        </AppProviders>
      </MemoryRouter>,
    )

    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Amazon' }).closest('li')).toHaveClass(
        'ant-menu-item-selected',
      ),
    )
  })
})
