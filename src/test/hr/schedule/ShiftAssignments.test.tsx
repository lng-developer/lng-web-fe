import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { ShiftAssignments } from '@/features/hr/ScheduleCalendar/ShiftAssignments'
import type { ShiftAssignmentsModel } from '@/features/hr/ScheduleCalendar/ShiftAssignments/useShiftAssignments'

const assignment = {
  id: 'assignment-1',
  profileId: 'profile-1',
  shiftId: 'shift-1',
  workLocationId: 'location-1',
  employee: { fullName: 'Jane Nguyen', employeeCode: 'J001' },
  shift: { name: 'Morning shift' },
  workLocation: { name: 'Head office' },
  effectiveFrom: '2026-09-01',
  effectiveTo: null,
  status: 'ACTIVE',
}

function createModel(overrides: Partial<ShiftAssignmentsModel> = {}) {
  return {
    canScheduleWrite: true,
    assignments: { isLoading: false, data: { items: [assignment] } },
    assignmentCount: 1,
    statusLabel: (value: string) => value,
    addAssignment: vi.fn(),
    ...overrides,
  } as unknown as ShiftAssignmentsModel
}

describe('ShiftAssignments', () => {
  it('offers edit and deactivate actions for an active assignment', () => {
    const model = createModel()

    render(
      <AppProviders>
        <ShiftAssignments model={model} />
      </AppProviders>,
    )

    expect(screen.getByRole('button', { name: 'Edit assignment' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Deactivate assignment' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Action' })).toHaveStyle({
      textAlign: 'right',
      width: '96px',
    })
  })

  it('requires confirmation before deactivating an assignment', () => {
    const deactivateAssignment = vi.fn()
    const model = createModel({ deactivateAssignment })

    render(
      <AppProviders>
        <ShiftAssignments model={model} />
      </AppProviders>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Deactivate assignment' }))
    expect(screen.getByText('Deactivate this assignment?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate' }))

    expect(deactivateAssignment).toHaveBeenCalledWith(assignment)
  })
})
