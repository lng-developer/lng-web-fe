import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api', () => ({
  apiClient: { delete: vi.fn(), get: vi.fn(), patch: vi.fn(), post: vi.fn() },
}))

import {
  createCalendarOverride,
  createHoliday,
  createShift,
  createShiftAssignment,
  createWorkLocation,
  deleteHoliday,
  deleteSaturdayRotation,
  generateSaturdayRotations,
  listCalendarOverrides,
  listHolidays,
  listSaturdayRotationMatrix,
  listShiftAssignments,
  listShifts,
  listWorkLocations,
  updateCalendarOverride,
  updateHoliday,
  updateShift,
  updateShiftAssignment,
  updateWorkLocation,
} from '@/features/hr/api/hrOperationsApi'
import { apiClient } from '@/shared/api'

describe('HR schedule and calendar API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(apiClient.get).mockResolvedValue({ data: { items: [], pagination: {} } })
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} })
    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} })
    vi.mocked(apiClient.delete).mockResolvedValue({ data: {} })
  })

  it('maps schedule resources to their backend contracts', async () => {
    await listWorkLocations({ limit: 100 })
    await createWorkLocation({ code: 'HN', name: 'Hanoi', timezone: 'Asia/Ho_Chi_Minh' })
    await updateWorkLocation('location-1', { status: 'SUSPENDED' })
    await listShifts({ status: 'ACTIVE' })
    await createShift({ code: 'DAY', name: 'Day', startTime: '08:00', endTime: '17:00' })
    await updateShift('shift-1', { graceMinutes: 10 })
    await listShiftAssignments({ profileId: 'profile-1' })
    await createShiftAssignment({
      profileId: 'profile-1',
      shiftId: 'shift-1',
      workLocationId: 'location-1',
      effectiveFrom: '2026-08-01',
    })
    await updateShiftAssignment('assignment-1', { effectiveTo: '2026-08-31' })
    await listCalendarOverrides({ dateKey: '2026-08-02' })
    await createCalendarOverride({
      dateKey: '2026-08-02',
      kind: 'WORKING_DAY',
      scopeType: 'GLOBAL',
      scopeId: null,
      name: 'Working Sunday',
    })
    await updateCalendarOverride('override-1', { name: 'Updated' })

    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/api/hr/work-locations', {
      params: { limit: 100 },
    })
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/hr/work-locations',
      expect.objectContaining({ code: 'HN' }),
    )
    expect(apiClient.patch).toHaveBeenCalledWith('/api/hr/work-locations/location-1', {
      status: 'SUSPENDED',
    })
    expect(apiClient.get).toHaveBeenCalledWith('/api/hr/shifts', { params: { status: 'ACTIVE' } })
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/hr/shifts',
      expect.objectContaining({ code: 'DAY' }),
    )
    expect(apiClient.patch).toHaveBeenCalledWith('/api/hr/shifts/shift-1', { graceMinutes: 10 })
    expect(apiClient.get).toHaveBeenCalledWith('/api/hr/shift-assignments', {
      params: { profileId: 'profile-1' },
    })
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/hr/shift-assignments',
      expect.objectContaining({ profileId: 'profile-1' }),
    )
    expect(apiClient.patch).toHaveBeenCalledWith('/api/hr/shift-assignments/assignment-1', {
      effectiveTo: '2026-08-31',
    })
    expect(apiClient.get).toHaveBeenCalledWith('/api/hr/calendar-overrides', {
      params: { dateKey: '2026-08-02' },
    })
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/hr/calendar-overrides',
      expect.objectContaining({ kind: 'WORKING_DAY' }),
    )
    expect(apiClient.patch).toHaveBeenCalledWith('/api/hr/calendar-overrides/override-1', {
      name: 'Updated',
    })
  })

  it('maps holiday and rotation actions to their backend contracts', async () => {
    await listHolidays({ dateFrom: '2026-01-01', dateTo: '2026-12-31' })
    await createHoliday({
      name: 'National Day',
      dateKey: '2026-09-02',
      holidayType: 'PUBLIC_HOLIDAY',
    })
    await updateHoliday('holiday-1', { note: 'Paid holiday' })
    await deleteHoliday('holiday-1')
    await listSaturdayRotationMatrix({ month: 8, year: 2026 })
    await generateSaturdayRotations({ teamId: 'team-1', month: 8, year: 2026, minPresent: 1 })
    await deleteSaturdayRotation('rotation-1')

    expect(apiClient.get).toHaveBeenCalledWith('/api/hr/holidays', {
      params: { dateFrom: '2026-01-01', dateTo: '2026-12-31' },
    })
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/hr/holidays',
      expect.objectContaining({ dateKey: '2026-09-02' }),
    )
    expect(apiClient.patch).toHaveBeenCalledWith('/api/hr/holidays/holiday-1', {
      note: 'Paid holiday',
    })
    expect(apiClient.delete).toHaveBeenCalledWith('/api/hr/holidays/holiday-1')
    expect(apiClient.get).toHaveBeenCalledWith('/api/hr/saturday-rotations/matrix', {
      params: { month: 8, year: 2026 },
    })
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/hr/saturday-rotations/generate',
      expect.objectContaining({ teamId: 'team-1' }),
    )
    expect(apiClient.delete).toHaveBeenCalledWith('/api/hr/saturday-rotations/rotation-1')
  })
})
