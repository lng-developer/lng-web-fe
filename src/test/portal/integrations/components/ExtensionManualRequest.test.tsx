import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import type { ExtensionManagementAgent } from '@/features/portal/integrations/api/integrationApi'
import { ExtensionManualRequest } from '@/features/portal/integrations/components/ExtensionManualRequest'
import { ExtensionCommandDrawer } from '@/features/portal/integrations/components/ExtensionCommandDrawer'
import type { ExtensionCommand } from '@/features/portal/integrations/api/integrationApi'

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
afterEach(cleanup)
const agent = {
  id: 'agent',
  shopId: 'shop',
  provider: 'ETSY',
  protocolVersion: 1,
  status: 'ONLINE',
} as ExtensionManagementAgent
const key = 'portal.integrations.extension.manualRequests'
it('queues Etsy count instead of a day window, defaulting to one', async () => {
  const onRequest = vi.fn()
  render(
    <ExtensionManualRequest agent={agent} source="ORDERS" loading={false} onRequest={onRequest} />,
  )
  fireEvent.click(screen.getByRole('button'))
  expect(await screen.findByRole('spinbutton')).toHaveValue('1')
  fireEvent.click(screen.getByText(`${key}.queue`))
  expect(onRequest).toHaveBeenCalledWith({
    agentId: 'agent',
    type: 'IMPORT_NEW_ORDERS',
    maxOrders: 1,
  })
})
it('accepts 200 and disables empty count', async () => {
  const onRequest = vi.fn()
  render(
    <ExtensionManualRequest agent={agent} source="ORDERS" loading={false} onRequest={onRequest} />,
  )
  fireEvent.click(screen.getByRole('button'))
  const input = await screen.findByRole('spinbutton')
  fireEvent.change(input, { target: { value: '200' } })
  fireEvent.click(screen.getByText(`${key}.queue`))
  expect(onRequest).toHaveBeenCalledWith({
    agentId: 'agent',
    type: 'IMPORT_NEW_ORDERS',
    maxOrders: 200,
  })
  fireEvent.change(input, { target: { value: '' } })
  expect(screen.getByText(`${key}.queue`).closest('button')).toBeDisabled()
})
it('keeps the Amazon day selector', async () => {
  render(
    <ExtensionManualRequest
      agent={{ ...agent, provider: undefined }}
      source="ORDERS"
      loading={false}
      onRequest={vi.fn()}
    />,
  )
  fireEvent.click(screen.getByRole('button'))
  expect(await screen.findByRole('combobox')).toBeInTheDocument()
  expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
})
it('disables offline agent and hides unsupported Etsy source', () => {
  const { rerender } = render(
    <ExtensionManualRequest
      agent={{ ...agent, status: 'OFFLINE' }}
      source="ORDERS"
      loading={false}
      onRequest={vi.fn()}
    />,
  )
  expect(screen.getByRole('button')).toBeDisabled()
  rerender(
    <ExtensionManualRequest agent={agent} source="ADS" loading={false} onRequest={vi.fn()} />,
  )
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})
it('shows requested count and import job in task details', () => {
  render(
    <ExtensionCommandDrawer
      command={
        {
          id: 'task',
          provider: 'ETSY',
          maxOrders: 5,
          status: 'FAILED',
          type: 'IMPORT_NEW_ORDERS',
          importJobId: 'job-123',
          errorMessage: 'ETSY_IMPORT_NEEDS_REVIEW',
        } as ExtensionCommand
      }
      onClose={vi.fn()}
    />,
  )
  expect(screen.getByText(`${key}.maxOrders`)).toBeInTheDocument()
  expect(screen.getByText('5')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'job-123' })).toHaveAttribute(
    'href',
    '?selectedJobId=job-123',
  )
  expect(screen.getByText('ETSY_IMPORT_NEEDS_REVIEW')).toBeInTheDocument()
})
