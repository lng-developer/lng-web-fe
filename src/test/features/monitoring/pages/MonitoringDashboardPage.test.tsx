import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/monitoring/api/monitoringApi', () => ({
  getSystemHealth: vi.fn(),
  getSystemLogs: vi.fn(),
  getMongoIndexUsageSnapshots: vi.fn(),
}))

import {
  getMongoIndexUsageSnapshots,
  getSystemHealth,
  getSystemLogs,
} from '@/features/monitoring/api/monitoringApi'
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
      realtime: {
        status: 'ok',
        connectedClients: 2,
        authenticatedUsers: 1,
        rooms: 3,
        connections: 4,
        disconnections: 2,
        authFailures: 0,
        eventFailures: 1,
        lastErrorAt: null,
        lastErrorMessage: null,
      },
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
    vi.mocked(getMongoIndexUsageSnapshots).mockResolvedValue([
      {
        capturedOn: '2026-08-25',
        capturedAt: '2026-08-25T01:00:00.000Z',
        database: 'lng_web_be',
        totals: { dataBytes: 10, storageBytes: 20, indexBytes: 30, collections: 2, indexes: 3 },
        collections: [
          {
            name: 'orders',
            documentCount: 12,
            dataBytes: 10,
            storageBytes: 20,
            indexBytes: 30,
            indexCount: 3,
            usageAvailable: true,
            indexes: [{ name: 'psdStatus_1', key: { psdStatus: 1 }, operations: 42 }],
            findings: [],
          },
        ],
      },
    ])
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

  it('shows realtime socket health', async () => {
    render(<MonitoringDashboardPage />)

    expect(await screen.findByText('Realtime Socket')).toBeVisible()
    expect(screen.getByText('Clients')).toBeVisible()
    expect(screen.getByText('Users')).toBeVisible()
    expect(screen.getByText('Event failed')).toBeVisible()
  })

  it('shows the selected Mongo index snapshot', async () => {
    render(<MonitoringDashboardPage />)

    fireEvent.click(document.querySelector('[data-node-key="mongo-indexes"]') as HTMLElement)
    expect(await screen.findByText('psdStatus_1')).toBeVisible()
    expect(screen.getByText('42')).toBeVisible()
    expect(screen.getByText('KEEP')).toBeVisible()
    await waitFor(() => expect(getMongoIndexUsageSnapshots).toHaveBeenCalledWith(30))
  })
})
