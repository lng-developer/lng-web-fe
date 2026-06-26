import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  buildDepartmentSummary,
  FAKE_DEPARTMENTS,
  getTeamsByDepartmentCode,
} from './departmentData.js'

describe('departmentData', () => {
  it('summarizes fake department data for the departments page', () => {
    assert.deepEqual(buildDepartmentSummary(FAKE_DEPARTMENTS), {
      totalDepartments: 3,
      totalMembers: 124,
      activeDepartments: 3,
    })
  })

  it('returns teams for the selected department code', () => {
    assert.deepEqual(
      getTeamsByDepartmentCode(FAKE_DEPARTMENTS, 'DEPT-QC').map((team) => team.code),
      ['TEAM-QC-01', 'TEAM-QC-02'],
    )
  })

  it('returns different fake teams for each department code', () => {
    assert.deepEqual(
      getTeamsByDepartmentCode(FAKE_DEPARTMENTS, 'DEPT-DESIGN').map((team) => team.code),
      ['TEAM-DESIGN-01', 'TEAM-DESIGN-02'],
    )
    assert.deepEqual(
      getTeamsByDepartmentCode(FAKE_DEPARTMENTS, 'DEPT-FULFILLMENT').map((team) => team.code),
      ['TEAM-FULFILL-01', 'TEAM-FULFILL-02'],
    )
  })
})
