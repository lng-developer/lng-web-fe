import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/monitoring/api/monitoringApi', () => ({
  getSystemHealth: vi.fn(),
  getSystemLogs: vi.fn(),
}))

import { getSystemHealth, getSystemLogs } from '@/features/monitoring/api/monitoringApi'
import { MonitoringDashboardPage } from '@/features/monitoring/pages/MonitoringDashboardPage'
import { setGlobalPermissions, setPermissions } from '@/shared/auth/session'

describe('MonitoringDashboardPage', () => {
  afterEach(cleanup)

  beforeEach(() => {
    vi.clearAllMocks()
    setPermissions(['AUDIT:READ'])
    setGlobalPermissions(['AUDIT:READ'])
    vi.mocked(getSystemHealth).mockResolvedValue({
      status: 'ok',
      generatedAt: '2026-08-12T00:00:00.000Z',
      uptimeSeconds: 12,
      nodeVersion: 'v22.0.0',
      memory: { heapUsedMb: 10, heapTotalMb: 20, rssMb: 30 },
      infrastructure: { mongo: 'CONNECTED', redis: 'CONNECTED', metrics: 'ENABLED' },
      modules: [],
      workers: [],
      queues: [],
    })
    vi.mocked(getSystemLogs).mockResolvedValue({
      process: 'lng-web-be',
      stream: 'out',
      lines: 200,
      filename: 'lng-web-be-out.log',
      content: ['api started', 'request ok'],
      availableProcesses: [
        { key: 'lng-web-be', label: 'Backend API' },
        { key: 'lng-web-be-import-workers', label: 'Import Workers' },
      ],
      availableStreams: ['out', 'error'],
    })
  })

  it('loads and displays backend logs for global audit readers', async () => {
    render(<MonitoringDashboardPage />)

    fireEvent.click(await screen.findByRole('tab', { name: 'Logs' }))
    expect(await screen.findByText('Server Logs')).toBeVisible()
    expect(await screen.findByText((content) => content.includes('api started'))).toBeVisible()
    expect(screen.getByText((content) => content.includes('request ok'))).toBeVisible()
    await waitFor(() =>
      expect(getSystemLogs).toHaveBeenCalledWith({
        process: 'lng-web-be',
        stream: 'out',
        lines: 200,
      }),
    )
  })
})
