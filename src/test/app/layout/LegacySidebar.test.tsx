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
    expect(screen.getByText('Design tasks')).toBeVisible()
    expect(screen.getByText('PSD files')).toBeVisible()

    fireEvent.click(screen.getByRole('button', { name: 'Vendor' }))
    expect(screen.getByText('Vendors')).toBeVisible()
    expect(screen.getByText('Vendor Integrations')).toBeVisible()

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
    expect(screen.getByRole('link', { name: 'Blocked' })).toHaveAttribute(
      'href',
      '/portal/production/blocked',
    )
    expect(screen.getByRole('link', { name: 'Vendor submissions' })).toHaveAttribute(
      'href',
      '/portal/vendor-submissions',
    )
    expect(screen.getByRole('link', { name: 'Shipments' })).toHaveAttribute(
      'href',
      '/portal/shipments',
    )
    expect(screen.queryByText('Working Status')).not.toBeInTheDocument()
    expect(screen.queryByText('Reports')).not.toBeInTheDocument()
  })

  it('links reports to dedicated Amazon and Etsy report pages', async () => {
    render(
      <MemoryRouter initialEntries={['/portal/reports']}>
        <AppProviders>
          <LegacySidebar collapsed={false} onCollapsedChange={() => undefined} />
        </AppProviders>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Sales' }))
    fireEvent.click(screen.getByText('Reports'))

    fireEvent.click(screen.getByRole('menuitem', { name: 'Amazon' }))
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Orders Cost' })).toHaveAttribute(
        'href',
        '/portal/reports/amazon/order-cost',
      ),
    )
    expect(screen.getByRole('link', { name: 'Ads Report' })).toHaveAttribute(
      'href',
      '/portal/reports/amazon/ads',
    )
    expect(screen.getByRole('link', { name: 'Sale Report' })).toHaveAttribute(
      'href',
      '/portal/reports/amazon/sales',
    )

    fireEvent.click(screen.getByRole('menuitem', { name: 'Etsy' }))
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Etsy Orders Cost' })).toHaveAttribute(
        'href',
        '/portal/reports/etsy/order-cost',
      ),
    )
    expect(screen.getByRole('link', { name: 'ADS Etsy' })).toHaveAttribute(
      'href',
      '/portal/reports/etsy/ads',
    )
    expect(screen.getByRole('link', { name: 'Etsy Sale Report' })).toHaveAttribute(
      'href',
      '/portal/reports/etsy/sales',
    )
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

  it('keeps Configuration limited to the available Shops and Integrations routes', async () => {
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
    expect(screen.queryByText('SKU Mapping')).not.toBeInTheDocument()
    expect(screen.queryByText('Cookies')).not.toBeInTheDocument()
    expect(screen.queryByText('TM Keywords')).not.toBeInTheDocument()
    expect(screen.queryByText('Account')).not.toBeInTheDocument()
  })

  it('keeps Design tasks as the sole task queue entry', async () => {
    render(
      <MemoryRouter initialEntries={['/portal/design']}>
        <AppProviders>
          <LegacySidebar collapsed={false} onCollapsedChange={() => undefined} />
        </AppProviders>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Design' }))
    expect(screen.getByRole('link', { name: 'Design tasks' })).toHaveAttribute(
      'href',
      '/portal/design',
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
})
