import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import { DashboardVisual } from '@/features/foundation/DashboardVisual'

test('renders the shared dashboard visual with supplied module metrics', () => {
  render(<DashboardVisual title="HR dashboard" dateLabel="Today" cards={[['12', 'Staff'], ['3', 'Present'], ['2', 'Requests'], ['1', 'Payroll']]} queueTitle="Queue" queueData={[{ label: 'Pending', value: 2 }]} summaryTitle="Summary" summaryData={[{ label: 'Today', value: 3 }]} targetTitle="Target" targetPercent={75} targetLabel="3 of 4" recentTitle="Recent" recentRows={['Employee A']} sideTitle="Highlights" sideRows={['On time']} />)
  expect(screen.getByRole('heading', { name: 'HR dashboard' })).toBeVisible()
  expect(screen.getByText('Staff')).toBeVisible()
  expect(screen.getByText('Employee A')).toBeVisible()
})
