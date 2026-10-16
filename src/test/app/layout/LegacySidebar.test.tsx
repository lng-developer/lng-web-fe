import { MemoryRouter } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { loadMyEmployeeProfile } = vi.hoisted(() => ({
  loadMyEmployeeProfile: vi.fn(),
}))

vi.mock('@/features/hr/api/hrApi', () => ({
  loadMyEmployeeProfile,
}))

import { LegacySidebar } from '@/app/layout/LegacySidebar'
import styles from '@/app/layout/LegacySidebar.module.scss'
import { AppProviders } from '@/app/providers/AppProviders'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import i18n from '@/shared/i18n/i18n'

const sidebarSummaryMocks = vi.hoisted(() => ({
  useOrderSummaryQuery: vi.fn(),
}))

vi.mock('@/features/portal/orders/hooks/useOrderSummaryQuery', () => ({
  useOrderSummaryQuery: sidebarSummaryMocks.useOrderSummaryQuery,
}))

describe('LegacySidebar', () => {
  beforeEach(() => {
    i18n.changeLanguage('en')
    sidebarSummaryMocks.useOrderSummaryQuery.mockReturnValue({ data: { tabCounts: { NEW: 12 } } })
    loadMyEmployeeProfile.mockResolvedValue({ fullName: 'Dynamic Operator' })
  })
  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it('shows actionable queue counts in their owning modules', () => {
    render(
      <MemoryRouter initialEntries={['/portal/orders']}>
        <AppProviders>
          <LegacySidebar collapsed={false} onCollapsedChange={() => undefined} financeVisible />
        </AppProviders>
      </MemoryRouter>,
    )

    expect(screen.getByTitle('12')).toBeVisible()
  })

  it('does not expose Mapping or Configuration through catalog read access', async () => {
    const account: CurrentAccount = {
      account: { id: 'leader', email: 'leader@example.test', mustChangePassword: false },
      profileSetupRequired: false,
      permissions: [],
      roles: [],
      scopes: [
        {
          assignmentId: 'assignment',
          resourceId: null,
          scopeType: 'team',
          scopeId: 'design-team',
          roles: ['DESIGN_LEADER'],
          permissions: ['CATALOG:READ', 'DESIGN:WRITE'],
        },
      ],
    }
    render(
      <MemoryRouter initialEntries={['/portal/listing/amazon']}>
        <AppProviders>
          <LegacySidebar collapsed={false} onCollapsedChange={() => undefined} account={account} />
        </AppProviders>
      </MemoryRouter>,
    )
    expect(screen.queryByText('Configuration')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Cost Centers'))
    await screen.findByText('Product Types')
    expect(screen.queryByText('Mapping')).not.toBeInTheDocument()
  })

  it('ports the legacy Sales menu labels and its expanded 52 + 202 pixel layout', async () => {
    render(
      <MemoryRouter initialEntries={['/portal/team-tasks']}>
        <AppProviders>
          <LegacySidebar collapsed={false} onCollapsedChange={() => undefined} financeVisible />
        </AppProviders>
      </MemoryRouter>,
    )

    expect(screen.getByRole('button', { name: 'Switch to Portal' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Switch to HR' })).toBeVisible()
    const menuLabels = [
      'Orders',
      'Team Tasks',
      'Listing',
      'Cost Centers',
      'Finance',
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
    const costCenterChildren = ['Product Types', 'Internal Templates', 'Mapping']
    await waitFor(() => {
      costCenterChildren.forEach((label) => {
        expect(screen.getByText(label)).toBeVisible()
      })
    })
    expect(screen.queryByText('Config')).not.toBeInTheDocument()
    expect(screen.queryByText('Group Standards')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Fulfillment' }))
    expect(screen.getByText('Scale')).toBeVisible()
    expect(screen.getByText('QC')).toBeVisible()
    expect(screen.getByText('Work scores')).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Design' }))
    expect(screen.getByText('PSD Tasks')).toBeVisible()
    expect(screen.getByText('PSD files')).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Vendor' }))
    expect(screen.getByText('Vendors')).toBeVisible()
    expect(screen.getByText('Vendor Integrations')).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Extensions' }))
    expect(screen.getByText('Manage Clients')).toBeVisible()
    expect(screen.getByText('Check Tracking')).toBeVisible()
  })

  it('keeps Setting at the bottom rail, manages HR via the core switch/top rail, and renders their navigation', async () => {
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

    // In Portal mode: bottom rail has Setting, not HR
    expect(screen.getByRole('button', { name: 'Setting' })).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'Setting' }).querySelector('.anticon-setting'),
    ).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'HR' })).not.toBeInTheDocument()

    // Switch to HR mode via header switcher
    fireEvent.click(screen.getByRole('button', { name: 'Switch to HR' }))
    expect(screen.getByRole('button', { name: 'HR' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'HR' }).querySelector('.anticon-team')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Sales' })).not.toBeInTheDocument()

    // HR navigation items are available
    expect(screen.getByText('Personal')).toBeVisible()
    expect(
      screen.getByText('Personal').closest('[role="menuitem"]')?.querySelector('.anticon-user'),
    ).toBeTruthy()
    fireEvent.click(screen.getByText('Personal'))
    await waitFor(() => expect(screen.getByText('My day')).toBeVisible())

    // Setting remains at the bottom rail
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

  it('keeps sales channels nested under the Scale and QC queues', async () => {
    render(
      <MemoryRouter initialEntries={['/portal/production']}>
        <AppProviders>
          <LegacySidebar collapsed={false} onCollapsedChange={() => undefined} />
        </AppProviders>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Fulfillment' }))
    fireEvent.click(screen.getByText('Scale'))
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'AMAZON Scale' })).toHaveAttribute(
        'href',
        '/portal/production/scale?salesChannelCode=AMAZON',
      ),
    )
    expect(screen.getByRole('link', { name: 'ETSY Scale' })).toHaveAttribute(
      'href',
      '/portal/production/scale?salesChannelCode=ETSY',
    )

    fireEvent.click(screen.getByText('QC'))
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'AMAZON QC' })).toHaveAttribute(
        'href',
        '/portal/production/qc?salesChannelCode=AMAZON',
      ),
    )
    expect(screen.getByRole('link', { name: 'ETSY QC' })).toHaveAttribute(
      'href',
      '/portal/production/qc?salesChannelCode=ETSY',
    )

    expect(screen.getByRole('link', { name: 'Work scores' })).toHaveAttribute(
      'href',
      '/portal/work-scores',
    )
    expect(screen.queryByRole('link', { name: 'Blocked' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Vendor Handoff' })).toHaveAttribute(
      'href',
      '/portal/vendor-submissions',
    )
    expect(screen.queryByRole('link', { name: 'Shipments' })).not.toBeInTheDocument()
    expect(screen.queryByText('Working Status')).not.toBeInTheDocument()
    expect(screen.queryByText('Reports')).not.toBeInTheDocument()
  })

  it('groups each report type by Amazon and Etsy', async () => {
    render(
      <MemoryRouter initialEntries={['/portal/reports']}>
        <AppProviders>
          <LegacySidebar collapsed={false} onCollapsedChange={() => undefined} />
        </AppProviders>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Sales' }))
    fireEvent.click(screen.getByText('Reports'))

    const reportTypes = [
      ['Orders Cost', '/portal/reports/amazon/order-cost', '/portal/reports/etsy/order-cost'],
      ['Ads Report', '/portal/reports/amazon/ads', '/portal/reports/etsy/ads'],
      ['Sale Report', '/portal/reports/amazon/sales', '/portal/reports/etsy/sales'],
    ] as const

    for (const [reportType, amazonPath, etsyPath] of reportTypes) {
      fireEvent.click(screen.getByRole('menuitem', { name: reportType }))

      expect(
        screen
          .getAllByRole('link', { name: 'Amazon' })
          .some((link) => link.getAttribute('href') === amazonPath),
      ).toBe(true)
      expect(
        screen
          .getAllByRole('link', { name: 'Etsy' })
          .some((link) => link.getAttribute('href') === etsyPath),
      ).toBe(true)
    }
  })

  it('visually nests report types beneath Reports', () => {
    render(
      <MemoryRouter initialEntries={['/portal/reports']}>
        <AppProviders>
          <LegacySidebar collapsed={false} onCollapsedChange={() => undefined} />
        </AppProviders>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Sales' }))
    fireEvent.click(screen.getByText('Reports'))

    for (const reportType of ['Orders Cost', 'Ads Report', 'Sale Report']) {
      expect(screen.getByRole('menuitem', { name: reportType }).closest('li')).toHaveClass(
        styles.reportChannel,
      )
    }
  })

  it('visually indents report channels beneath their report type', () => {
    render(
      <MemoryRouter initialEntries={['/portal/reports']}>
        <AppProviders>
          <LegacySidebar collapsed={false} onCollapsedChange={() => undefined} />
        </AppProviders>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Sales' }))
    fireEvent.click(screen.getByText('Reports'))
    for (const reportType of ['Orders Cost', 'Ads Report', 'Sale Report']) {
      fireEvent.click(screen.getByRole('menuitem', { name: reportType }))
    }

    const reportChannels = screen
      .getAllByRole('link', { name: /^(Amazon|Etsy)$/ })
      .filter((link) => link.getAttribute('href')?.startsWith('/portal/reports'))
    expect(reportChannels).toHaveLength(6)
    for (const channel of reportChannels) {
      expect(channel.closest('li')).toHaveClass(styles.reportChannelItem)
    }
  })

  it('links Monitoring directly to its available portal dashboard', () => {
    render(
      <MemoryRouter initialEntries={['/portal/team-tasks']}>
        <AppProviders>
          <LegacySidebar collapsed={false} onCollapsedChange={() => undefined} />
        </AppProviders>
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Monitoring' })).toHaveAttribute(
      'href',
      '/portal/monitoring',
    )
    expect(screen.queryByText('Order Lifecycle')).not.toBeInTheDocument()
    expect(screen.queryByText('Order Missing Sync')).not.toBeInTheDocument()
  })

  it('keeps Shipments with the Configuration routes', async () => {
    render(
      <MemoryRouter initialEntries={['/portal/team-tasks']}>
        <AppProviders>
          <LegacySidebar collapsed={false} onCollapsedChange={() => undefined} />
        </AppProviders>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByText('Configuration'))

    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Shops' })).toHaveAttribute('href', '/portal/shops'),
    )
    expect(screen.getByRole('link', { name: 'Integrations' })).toHaveAttribute(
      'href',
      '/portal/integrations',
    )
    expect(screen.getByRole('link', { name: 'Shipments' })).toHaveAttribute(
      'href',
      '/portal/shipments',
    )
    expect(screen.queryByText('SKU Mapping')).not.toBeInTheDocument()
    expect(screen.queryByText('Cookies')).not.toBeInTheDocument()
    expect(screen.queryByText('TM Keywords')).not.toBeInTheDocument()
    expect(screen.queryByText('Account')).not.toBeInTheDocument()
  })

  it('nests Amazon and Etsy task queues under PSD Tasks without wrapper', async () => {
    render(
      <MemoryRouter initialEntries={['/portal/design/idea-tasks']}>
        <AppProviders>
          <LegacySidebar collapsed={false} onCollapsedChange={() => undefined} />
        </AppProviders>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Design' }))
    expect(screen.queryByRole('menuitem', { name: /^Design tasks/ })).not.toBeInTheDocument()
    expect(screen.queryByText('Design Workspace')).not.toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /^PSD Tasks/ })).toBeVisible()
    fireEvent.click(screen.getByRole('menuitem', { name: /^PSD Tasks/ }))
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Amazon tasks' })).toHaveAttribute(
        'href',
        '/portal/design/psd-tasks?salesChannelCode=amazon',
      ),
    )
    expect(screen.getByRole('link', { name: 'Etsy tasks' })).toHaveAttribute(
      'href',
      '/portal/design/psd-tasks?salesChannelCode=etsy',
    )
    expect(screen.getByRole('menuitem', { name: /^PSD Tasks/ }).closest('li')).not.toHaveClass(
      styles.reportChannel,
    )
    expect(screen.getByRole('link', { name: 'Amazon tasks' }).closest('li')).not.toHaveClass(
      styles.reportChannelItem,
    )
    expect(screen.getByRole('link', { name: 'Etsy tasks' }).closest('li')).not.toHaveClass(
      styles.reportChannelItem,
    )
    expect(screen.getByRole('link', { name: 'PSD files' })).toHaveAttribute(
      'href',
      '/portal/design/files',
    )
    expect(screen.getByRole('link', { name: 'Media' })).toHaveAttribute('href', '/portal/media')
    expect(screen.queryByText('All task types')).not.toBeInTheDocument()
    expect(screen.queryByText('Embroider Listing')).not.toBeInTheDocument()
    expect(screen.queryByText('Points Dashboard')).not.toBeInTheDocument()
  })

  it.each([
    ['/portal/orders?salesChannelCode=amazon', ['Orders'], 'Amazon'],
    ['/portal/listing/amazon', ['Listing'], 'Amz Listing'],
    ['/portal/reports/amazon/ads', ['Reports', 'Ads Report'], 'Amazon'],
    ['/portal/production/scale?salesChannelCode=AMAZON', ['Scale'], 'AMAZON Scale'],
    ['/portal/design/psd-tasks?salesChannelCode=amazon', ['PSD Tasks'], 'Amazon tasks'],
    ['/portal/shops', ['Configuration'], 'Shops'],
  ])('restores %s menu context from the URL', async (url, parents, child) => {
    render(
      <MemoryRouter initialEntries={[url]}>
        <AppProviders>
          <LegacySidebar collapsed={false} onCollapsedChange={() => undefined} />
        </AppProviders>
      </MemoryRouter>,
    )

    parents.forEach((parent) => {
      expect(screen.getByRole('menuitem', { name: new RegExp(`^${parent}`) })).toHaveAttribute(
        'aria-expanded',
        'true',
      )
    })
    expect(screen.getByRole('link', { name: child })).toBeVisible()
  })

  it('restores a dynamic System submenu from the URL', () => {
    render(
      <MemoryRouter initialEntries={['/auth/accounts']}>
        <AppProviders>
          <LegacySidebar
            collapsed={false}
            onCollapsedChange={() => undefined}
            bottomMenus={{
              hr: [],
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

    expect(screen.getByRole('menuitem', { name: /Configuration/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(screen.getByRole('link', { name: 'Accounts' })).toBeVisible()
  })

  it('links Vendor workflows to their focused workspace tabs', () => {
    render(
      <MemoryRouter initialEntries={['/portal/vendors']}>
        <AppProviders>
          <LegacySidebar collapsed={false} onCollapsedChange={() => undefined} />
        </AppProviders>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Vendor' }))

    expect(screen.getByRole('link', { name: 'Vendors' })).toHaveAttribute('href', '/portal/vendors')
    expect(screen.getByRole('link', { name: 'Vendor Products' })).toHaveAttribute(
      'href',
      '/portal/vendors?tab=products',
    )
    expect(screen.getByRole('link', { name: 'Vendor Integrations' })).toHaveAttribute(
      'href',
      '/portal/vendors?tab=integrations',
    )
    expect(screen.getByRole('link', { name: 'Product Type Migration' })).toHaveAttribute(
      'href',
      '/portal/vendors?tab=migration',
    )
    expect(screen.queryByText('Store Fulfill')).not.toBeInTheDocument()
  })

  it('toggles between Portal and HR workspaces using the core switch', () => {
    render(
      <MemoryRouter initialEntries={['/portal/orders']}>
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
              system: [],
            }}
          />
        </AppProviders>
      </MemoryRouter>,
    )

    const portalBtn = screen.getByRole('button', { name: 'Switch to Portal' })
    const hrBtn = screen.getByRole('button', { name: 'Switch to HR' })

    expect(portalBtn).toHaveClass(styles.coreSwitchActive)
    expect(hrBtn).not.toHaveClass(styles.coreSwitchActive)
    expect(screen.getByRole('button', { name: 'Sales' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Fulfillment' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'HR' })).not.toBeInTheDocument()

    // Switch to HR
    fireEvent.click(hrBtn)
    expect(hrBtn).toHaveClass(styles.coreSwitchActive)
    expect(screen.getByRole('button', { name: 'HR' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Sales' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Fulfillment' })).not.toBeInTheDocument()

    // Switch back to Portal
    fireEvent.click(portalBtn)
    expect(portalBtn).toHaveClass(styles.coreSwitchActive)
    expect(screen.getByRole('button', { name: 'Sales' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Fulfillment' })).toBeVisible()
    expect(screen.queryByRole('button', { name: 'HR' })).not.toBeInTheDocument()
  })

  it('renders Portal Dashboard and HR Dashboard in their respective rail modes', async () => {
    render(
      <MemoryRouter initialEntries={['/portal/dashboard']}>
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
              system: [],
            }}
          />
        </AppProviders>
      </MemoryRouter>,
    )

    // In Portal mode: rail button for Dashboard is active and no duplicate Dashboard link in secondary menu
    const portalDashboardRailBtn = screen.getByRole('button', { name: 'Dashboard' })
    expect(portalDashboardRailBtn).toBeVisible()
    expect(portalDashboardRailBtn).toHaveClass(styles.railButtonActive)
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument()

    // Switch to HR mode
    fireEvent.click(screen.getByRole('button', { name: 'Switch to HR' }))

    // In HR mode: rail has Dashboard button
    const hrDashboardRailBtn = screen.getByRole('button', { name: 'Dashboard' })
    expect(hrDashboardRailBtn).toBeVisible()
    fireEvent.click(hrDashboardRailBtn)
    expect(hrDashboardRailBtn).toHaveClass(styles.railButtonActive)
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument()
  })

  it('navigates to Dashboard when clicking the LNG logo and supports compact core switch when collapsed', async () => {
    render(
      <MemoryRouter initialEntries={['/portal/orders']}>
        <AppProviders>
          <LegacySidebar
            collapsed={true}
            onCollapsedChange={() => undefined}
            bottomMenus={{ hr: [], system: [] }}
          />
        </AppProviders>
      </MemoryRouter>,
    )

    // When collapsed in portal mode, compact core switch shows "PORTAL"
    const compactSwitch = screen.getByRole('button', { name: 'Switch to HR' })
    expect(compactSwitch).toBeVisible()
    expect(compactSwitch).toHaveTextContent('PORTAL')

    // Click logo in portal mode
    const logoButton = screen.getByRole('button', { name: 'LNG Web' })
    expect(logoButton).toBeVisible()

    // Switch to HR mode via compact switch
    fireEvent.click(compactSwitch)
    expect(screen.getByRole('button', { name: 'Switch to Portal' })).toHaveTextContent('HR')
  })

  it('renders HR navigation groups collapsed by default on HR dashboard', async () => {
    render(
      <MemoryRouter initialEntries={['/hr/dashboard']}>
        <AppProviders>
          <LegacySidebar
            collapsed={false}
            onCollapsedChange={() => undefined}
            bottomMenus={{
              hr: [
                {
                  key: 'dashboard',
                  labelKey: 'shell.navigation.dashboard',
                  standalone: true,
                  items: [
                    {
                      key: 'hr-dashboard',
                      path: '/hr/dashboard',
                      labelKey: 'shell.navigation.dashboard',
                    },
                  ],
                },
                {
                  key: 'personal',
                  labelKey: 'shell.groups.personal',
                  items: [{ key: 'my-day', path: '/hr/me', labelKey: 'shell.navigation.myDay' }],
                },
                {
                  key: 'team',
                  labelKey: 'shell.groups.team',
                  items: [
                    {
                      key: 'team-overview',
                      path: '/hr/team',
                      labelKey: 'shell.navigation.teamOverview',
                    },
                  ],
                },
                {
                  key: 'operations',
                  labelKey: 'shell.groups.hrOperations',
                  items: [
                    {
                      key: 'organization',
                      path: '/organization',
                      labelKey: 'shell.navigation.organization',
                    },
                  ],
                },
              ],
              system: [],
            }}
          />
        </AppProviders>
      </MemoryRouter>,
    )

    // Dashboard rail button is active and no duplicate Dashboard link in secondary menu
    expect(screen.getByRole('button', { name: 'Dashboard' })).toHaveClass(styles.railButtonActive)
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument()

    // All HR group labels are present and collapsed by default
    expect(screen.getByRole('menuitem', { name: /Personal/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(screen.getByRole('menuitem', { name: /Team management/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(screen.getByRole('menuitem', { name: /HR operations/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    )

    // Expanding a group reveals its subitems
    fireEvent.click(screen.getByRole('menuitem', { name: /Personal/ }))
    await waitFor(() => expect(screen.getByRole('link', { name: 'My day' })).toBeVisible())
  })

  it('omits a navigation group when only its dashboard link is removed', () => {
    render(
      <MemoryRouter initialEntries={['/hr/me']}>
        <AppProviders>
          <LegacySidebar
            collapsed={false}
            onCollapsedChange={() => undefined}
            bottomMenus={{
              hr: [
                {
                  key: 'personal',
                  labelKey: 'shell.groups.personal',
                  items: [{ key: 'my-day', path: '/hr/me', labelKey: 'shell.navigation.myDay' }],
                },
                {
                  key: 'operations',
                  labelKey: 'shell.groups.hrOperations',
                  items: [
                    {
                      key: 'hr-dashboard',
                      path: '/hr/dashboard',
                      labelKey: 'shell.navigation.dashboard',
                    },
                  ],
                },
              ],
              system: [],
            }}
          />
        </AppProviders>
      </MemoryRouter>,
    )

    expect(screen.queryByRole('menuitem', { name: /HR operations/ })).not.toBeInTheDocument()
  })

  it('renders Portal navigation groups collapsed by default on Portal dashboard', async () => {
    render(
      <MemoryRouter initialEntries={['/portal/dashboard']}>
        <AppProviders>
          <LegacySidebar collapsed={false} onCollapsedChange={() => undefined} />
        </AppProviders>
      </MemoryRouter>,
    )

    // Dashboard rail button is active and no duplicate Dashboard link in secondary menu
    expect(screen.getByRole('button', { name: 'Dashboard' })).toHaveClass(styles.railButtonActive)
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument()

    // Portal navigation groups are present and collapsed
    expect(screen.getByRole('menuitem', { name: /^Orders/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(screen.getByRole('link', { name: 'Team Tasks' })).toBeVisible()
    expect(screen.getByRole('menuitem', { name: /^Listing/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(screen.getByRole('menuitem', { name: /^Reports/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(screen.getByRole('menuitem', { name: /^Configuration/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    )

    // Subitems become visible only when user clicks to expand
    fireEvent.click(screen.getByRole('menuitem', { name: /^Orders/ }))
    await waitFor(() => expect(screen.getByRole('link', { name: 'Amazon' })).toBeVisible())
    await waitFor(() => expect(screen.getByRole('link', { name: 'Etsy' })).toBeVisible())
  })

  it('defaults to Portal Dashboard when switching from HR if no route was remembered', async () => {
    localStorage.removeItem('lng:last-route:portal')
    render(
      <MemoryRouter initialEntries={['/hr/dashboard']}>
        <AppProviders>
          <LegacySidebar
            collapsed={false}
            onCollapsedChange={() => undefined}
            bottomMenus={{ hr: [], system: [], portal: [] }}
          />
        </AppProviders>
      </MemoryRouter>,
    )

    const portalBtn = screen.getByRole('button', { name: 'Switch to Portal' })
    fireEvent.click(portalBtn)

    // In Portal mode, Dashboard rail button is active
    expect(screen.getByRole('button', { name: 'Dashboard' })).toHaveClass(styles.railButtonActive)
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument()
  })

  it('jumps to the most recently opened screen in Portal when switching from HR', async () => {
    localStorage.setItem('lng:last-route:portal', '/portal/orders')
    render(
      <MemoryRouter initialEntries={['/hr/dashboard']}>
        <AppProviders>
          <LegacySidebar
            collapsed={false}
            onCollapsedChange={() => undefined}
            bottomMenus={{ hr: [], system: [], portal: [] }}
          />
        </AppProviders>
      </MemoryRouter>,
    )

    const portalBtn = screen.getByRole('button', { name: 'Switch to Portal' })
    fireEvent.click(portalBtn)

    expect(screen.getByRole('button', { name: 'Sales' })).toBeVisible()
    localStorage.removeItem('lng:last-route:portal')
  })

  it('preserves the most recently visited portal module menu (e.g. Design) when entering Portal Dashboard', async () => {
    localStorage.setItem('lng:last-portal-menu', 'design')
    render(
      <MemoryRouter initialEntries={['/portal/dashboard']}>
        <AppProviders>
          <LegacySidebar collapsed={false} onCollapsedChange={() => undefined} />
        </AppProviders>
      </MemoryRouter>,
    )

    // Dashboard rail button is active
    expect(screen.getByRole('button', { name: 'Dashboard' })).toHaveClass(styles.railButtonActive)

    // The secondary menu displays Design module instead of Sales/Orders
    expect(screen.getByRole('menuitem', { name: /^PSD Tasks/ })).toBeVisible()
    expect(screen.getByRole('link', { name: 'PSD files' })).toBeVisible()
    expect(screen.queryByRole('menuitem', { name: /^Orders/ })).not.toBeInTheDocument()

    localStorage.removeItem('lng:last-portal-menu')
  })

  it('opens secondary menu with Orders group expanded and does not navigate to generic orders when clicking Sales rail icon', async () => {
    const onCollapsedChange = vi.fn()
    render(
      <MemoryRouter initialEntries={['/portal/dashboard']}>
        <AppProviders>
          <LegacySidebar collapsed={false} onCollapsedChange={onCollapsedChange} />
        </AppProviders>
      </MemoryRouter>,
    )

    // Initially on dashboard, Orders group is collapsed
    expect(screen.getByRole('menuitem', { name: /^Orders/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    )

    // Click Sales rail button
    fireEvent.click(screen.getByRole('button', { name: 'Sales' }))

    // Secondary column has Sales menu active, with Orders submenu expanded to show channels
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Amazon' })).toHaveAttribute(
        'href',
        '/portal/orders?salesChannelCode=amazon',
      )
      expect(screen.getByRole('link', { name: 'Etsy' })).toHaveAttribute(
        'href',
        '/portal/orders?salesChannelCode=etsy',
      )
      expect(screen.getByRole('link', { name: 'Shopify' })).toHaveAttribute(
        'href',
        '/portal/orders?salesChannelCode=shopify',
      )
    })
  })

  it('expands collapsed sidebar and expands Orders submenu when clicking Sales rail button', async () => {
    const onCollapsedChange = vi.fn()
    render(
      <MemoryRouter initialEntries={['/portal/dashboard']}>
        <AppProviders>
          <LegacySidebar collapsed={true} onCollapsedChange={onCollapsedChange} />
        </AppProviders>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Sales' }))

    expect(onCollapsedChange).toHaveBeenCalledWith(false)
  })

  describe('RBAC permission filtering in LegacySidebar', () => {
    const makeAccount = (permissions: string[], roles: string[] = []): CurrentAccount => ({
      account: { id: 'test-acc', email: 'test@lng.com', mustChangePassword: false },
      roles,
      permissions,
      scopes: [],
      profileSetupRequired: false,
    })

    it('filters out unauthorized rail icons and menu items for a scoped Order operator', () => {
      const orderOperator = makeAccount(['ORDERS:READ'])

      render(
        <MemoryRouter initialEntries={['/portal/orders']}>
          <AppProviders>
            <LegacySidebar
              collapsed={false}
              onCollapsedChange={() => undefined}
              account={orderOperator}
            />
          </AppProviders>
        </MemoryRouter>,
      )

      // Sales button is present because Orders is accessible
      expect(screen.getByRole('button', { name: 'Sales' })).toBeVisible()

      // Orders is visible in the detail menu
      expect(screen.getByText('Orders')).toBeVisible()

      // Unauthorized rail buttons are NOT rendered
      expect(screen.queryByRole('button', { name: 'Design' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Fulfillment' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Vendor' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Extensions' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Setting' })).not.toBeInTheDocument()

      // Unauthorized detail menu items under Sales are NOT rendered
      expect(screen.queryByText('Listing')).not.toBeInTheDocument()
      expect(screen.queryByText('Cost Centers')).not.toBeInTheDocument()
      expect(screen.queryByText('Reports')).not.toBeInTheDocument()
      expect(screen.queryByText('Monitoring')).not.toBeInTheDocument()
      expect(screen.queryByText('Finance')).not.toBeInTheDocument()

      // HR switch is not rendered because no HR permission
      expect(screen.queryByRole('button', { name: 'Switch to HR' })).not.toBeInTheDocument()
    })

    it('shows only Design rail icon and design menus for a pure Designer', () => {
      const designer = makeAccount(['DESIGN:READ', 'DESIGN:WORK'])

      render(
        <MemoryRouter initialEntries={['/portal/design/idea-tasks']}>
          <AppProviders>
            <LegacySidebar
              collapsed={false}
              onCollapsedChange={() => undefined}
              account={designer}
            />
          </AppProviders>
        </MemoryRouter>,
      )

      // Design rail button is present
      expect(screen.getByRole('button', { name: 'Design' })).toBeVisible()

      // Sales, Vendor, Extensions, Settings are hidden
      expect(screen.queryByRole('button', { name: 'Sales' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Vendor' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Extensions' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Setting' })).not.toBeInTheDocument()

      // Inside Design, design tasks are visible
      expect(screen.getByText('Idea Tasks')).toBeVisible()
      expect(screen.getByText('PSD Tasks')).toBeVisible()
      expect(screen.getByText('PNG Tasks')).toBeVisible()
    })

    it('renders all menus for a SUPER_ADMIN account', () => {
      const superAdmin = makeAccount([], ['SUPER_ADMIN'])

      render(
        <MemoryRouter initialEntries={['/portal/orders']}>
          <AppProviders>
            <LegacySidebar
              collapsed={false}
              onCollapsedChange={() => undefined}
              account={superAdmin}
              financeVisible
            />
          </AppProviders>
        </MemoryRouter>,
      )

      expect(screen.getByRole('button', { name: 'Sales' })).toBeVisible()
      expect(screen.getByRole('button', { name: 'Fulfillment' })).toBeVisible()
      expect(screen.getByRole('button', { name: 'Design' })).toBeVisible()
      expect(screen.getByRole('button', { name: 'Vendor' })).toBeVisible()
      expect(screen.getByRole('button', { name: 'Extensions' })).toBeVisible()
      expect(screen.getByRole('button', { name: 'Switch to HR' })).toBeVisible()
    })
  })
})
