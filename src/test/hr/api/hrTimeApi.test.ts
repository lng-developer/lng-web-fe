import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api', () => ({
  apiClient: { delete: vi.fn(), get: vi.fn(), patch: vi.fn(), post: vi.fn(), put: vi.fn() },
}))

import {
  approveLeaveRequest,
  approveOvertimeRequest,
  checkIn,
  createLeaveRequest,
  createOvertimeRequest,
  finalizePayroll,
  getHrDashboard,
  getMyHrWorkspace,
  getTeamHrWorkspace,
  listAnnouncements,
  listAttendanceMatrix,
  listLeaveRequests,
  listMyAttendance,
  listMyLeaveBalances,
  listOvertimeRequests,
  listPayrolls,
  markPayrollPaid,
  runPayroll,
  updateLeaveRequest,
  updateOvertimeRequest,
} from '@/features/hr/api/hrTimeApi'
import { apiClient } from '@/shared/api'

describe('HR time and payroll API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(apiClient.get).mockResolvedValue({ data: { items: [] } })
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} })
    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} })
  })

  it('maps attendance, leave and overtime lifecycle endpoints', async () => {
    await listAttendanceMatrix({ month: 8, year: 2026 })
    await listMyAttendance({ month: 8, year: 2026 })
    await checkIn({ occurredAt: '2026-08-01T01:00:00.000Z' })
    await listMyLeaveBalances()
    await listLeaveRequests({ status: 'PENDING' })
    await createLeaveRequest({ leaveType: 'ANNUAL' })
    await updateLeaveRequest('leave-1', { leaveType: 'SICK' })
    await approveLeaveRequest('leave-1', { comment: 'Approved' })
    await listOvertimeRequests({ status: 'PENDING' })
    await createOvertimeRequest({ workDateKey: '2026-08-01' })
    await updateOvertimeRequest('ot-1', { workDateKey: '2026-08-02' })
    await approveOvertimeRequest('ot-1', { approvedMinutes: 120 })

    expect(apiClient.get).toHaveBeenCalledWith('/api/hr/attendance/month-matrix', {
      params: { month: 8, year: 2026 },
    })
    expect(apiClient.post).toHaveBeenCalledWith('/api/hr/attendance/check-in', {
      occurredAt: '2026-08-01T01:00:00.000Z',
    })
    expect(apiClient.get).toHaveBeenCalledWith('/api/hr/leave-balances/me')
    expect(apiClient.post).toHaveBeenCalledWith('/api/hr/leave-requests/leave-1/approve', {
      comment: 'Approved',
    })
    expect(apiClient.patch).toHaveBeenCalledWith('/api/hr/leave-requests/leave-1', {
      leaveType: 'SICK',
    })
    expect(apiClient.post).toHaveBeenCalledWith('/api/hr/overtime-requests/ot-1/approve', {
      approvedMinutes: 120,
    })
    expect(apiClient.patch).toHaveBeenCalledWith('/api/hr/overtime-requests/ot-1', {
      workDateKey: '2026-08-02',
    })
  })

  it('maps payroll and overview endpoints', async () => {
    await listPayrolls({ year: 2026 })
    await runPayroll({ month: 8, year: 2026 })
    await finalizePayroll('run-1', 2)
    await markPayrollPaid('run-1', ['result-1'], 3)
    await listAnnouncements({ status: 'PUBLISHED' })
    await getHrDashboard('2026-08-01')

    expect(apiClient.post).toHaveBeenCalledWith('/api/hr/payrolls/run', { month: 8, year: 2026 })
    expect(apiClient.post).toHaveBeenCalledWith('/api/hr/payrolls/run-1/finalize', {
      expectedVersion: 2,
    })
    expect(apiClient.post).toHaveBeenCalledWith('/api/hr/payrolls/run-1/mark-paid', {
      payrollResultIds: ['result-1'],
      expectedVersion: 3,
    })
    expect(apiClient.get).toHaveBeenCalledWith('/api/hr/announcements', {
      params: { status: 'PUBLISHED' },
    })
    expect(apiClient.get).toHaveBeenCalledWith('/api/hr/dashboard', {
      params: { dateKey: '2026-08-01' },
    })
  })

  it('loads aggregated personal and scoped team workspaces', async () => {
    const params = { dateKey: '2026-08-01', month: 8, year: 2026 }
    await getMyHrWorkspace(params)
    await getTeamHrWorkspace({ ...params, teamId: 'team-1' })

    expect(apiClient.get).toHaveBeenCalledWith('/api/hr/workspace/me', { params })
    expect(apiClient.get).toHaveBeenCalledWith('/api/hr/workspace/team', {
      params: { ...params, teamId: 'team-1' },
    })
  })
})
