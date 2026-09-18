import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import { ExtensionAutomationTab } from '@/features/portal/integrations/components/ExtensionAutomationTab'
import { ExtensionManualRequest } from '@/features/portal/integrations/components/ExtensionManualRequest'
import i18n from '@/shared/i18n/i18n'

const agent = {
  id: 'a',
  shopId: 'shop-a',
  clientId: 'c',
  label: 'RDC',
  version: 'test',
  apiBaseUrl: 'https://example.test',
  status: 'ONLINE' as const,
  lastSeenAt: '',
  token: null,
}
beforeEach(async () => {
  await i18n.changeLanguage('en')
})

it('queues a selected order history window without changing a schedule', async () => {
  const onRequest = vi.fn()
  render(
    <ExtensionManualRequest agent={agent} source="ORDERS" loading={false} onRequest={onRequest} />,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Request order sync now' }))
  fireEvent.mouseDown(await screen.findByRole('combobox', { name: 'Order history window' }))
  fireEvent.click(await screen.findByText('30 days'))
  fireEvent.click(screen.getByRole('button', { name: 'Queue import' }))
  expect(onRequest).toHaveBeenCalledWith({ agentId: 'a', type: 'IMPORT_NEW_ORDERS', numDays: 30 })
})

it('blocks manual requests while offline or another request is pending', () => {
  const onRequest = vi.fn()
  const { rerender } = render(
    <ExtensionManualRequest
      agent={{ ...agent, status: 'OFFLINE' }}
      source="ADS"
      loading={false}
      onRequest={onRequest}
    />,
  )
  expect(screen.getByRole('button', { name: 'Request ads sync now' })).toBeDisabled()
  rerender(<ExtensionManualRequest agent={agent} source="ADS" loading onRequest={onRequest} />)
  expect(screen.getByRole('button', { name: 'Request ads sync now' })).toBeDisabled()
})

it('shows manual and schedule controls only for shops the operator can write', () => {
  const account: CurrentAccount = {
    account: { id: 'u', email: 'test@example.test', mustChangePassword: false },
    roles: [],
    permissions: [],
    profileSetupRequired: false,
    scopes: [
      {
        assignmentId: 'assignment-a',
        scopeType: 'shop',
        scopeId: 'shop-a',
        resourceId: 'shop-a',
        roles: [],
        permissions: ['FINANCE:WRITE'],
      },
    ],
  }
  render(
    <ExtensionAutomationTab
      account={account}
      agents={[agent, { ...agent, id: 'b', shopId: 'shop-b' }]}
      schedules={[]}
      financeSchedules={[]}
      shopNames={
        new Map([
          ['shop-a', 'A'],
          ['shop-b', 'B'],
        ])
      }
      isLoading={false}
      canWriteOrders
      canWriteFinance
      isSavingSchedule={false}
      isSavingFinanceSchedule={false}
      isCreatingCommand={false}
      onSaveSchedule={vi.fn()}
      onSaveFinanceSchedule={vi.fn()}
      onCreateCommand={vi.fn()}
    />,
  )
  const allowed = within(screen.getByRole('article', { name: 'A / RDC' }))
  expect(allowed.getByRole('button', { name: 'Request ads sync now' })).toBeVisible()
  expect(allowed.queryByRole('button', { name: 'Request order sync now' })).not.toBeInTheDocument()
  expect(
    allowed.queryByRole('button', { name: /Configure order schedule/ }),
  ).not.toBeInTheDocument()
  expect(
    within(screen.getByRole('article', { name: 'B / RDC' })).queryAllByRole('button'),
  ).toHaveLength(0)
})
