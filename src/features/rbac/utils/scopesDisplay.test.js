import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildAddScopePayload,
  buildScopeFormPayload,
  canDeactivateScope,
  filterScopeItems,
  getScopeDepartmentName,
  getScopeTypeLabel,
  getScopeTypeMeta,
} from './scopesDisplay.js'

test('canDeactivateScope blocks inactive scopes and scopes with assignments', () => {
  assert.equal(canDeactivateScope({ status: 'active', assignmentCount: 2 }), false)
  assert.equal(canDeactivateScope({ status: 'active', assignmentCount: 0 }), true)
  assert.equal(canDeactivateScope({ status: 'inactive', assignmentCount: 0 }), false)
})

test('filterScopeItems filters by search, type, and status', () => {
  const scopes = [
    {
      id: '1',
      scopeType: 'department',
      scopeId: 'dept-qc',
      name: 'Quality Control',
      status: 'active',
      resource: { code: 'QC', name: 'QC Department' },
    },
    {
      id: '2',
      scopeType: 'team',
      scopeId: 'team-print',
      name: 'Print Team',
      status: 'inactive',
      parentDepartment: { name: 'Fulfillment' },
      resource: { code: 'PRINT' },
    },
  ]

  assert.deepEqual(
    filterScopeItems(scopes, { search: 'fulfill', scopeType: 'team', status: 'inactive' }).map(
      (scope) => scope.id,
    ),
    ['2'],
  )
})

test('getScopeDepartmentName resolves parent department names and falls back to dash', () => {
  assert.equal(
    getScopeDepartmentName({
      scopeType: 'team',
      parentDepartment: { name: 'QC' },
    }),
    'QC',
  )
  assert.equal(getScopeDepartmentName({ scopeType: 'department', name: 'QC' }), '—')
  assert.equal(getScopeDepartmentName({ scopeType: 'global', name: 'Global' }), '—')
})

test('buildScopeFormPayload uses selected resource name when form name is empty', () => {
  assert.deepEqual(
    buildScopeFormPayload(
      { scopeType: 'department', scopeId: 'dept-id', name: '', code: 'DEPT-QC' },
      [{ id: 'dept-id', name: 'QC Department' }],
    ),
    {
      scopeType: 'department',
      scopeId: 'dept-id',
      name: 'QC Department',
    },
  )

  assert.deepEqual(
    buildScopeFormPayload(
      { scopeType: 'team', scopeId: 'team-id', name: ' Print Team ', code: 'TEAM-PRINT' },
      [{ id: 'team-id', name: 'Default Team' }],
    ),
    {
      scopeType: 'team',
      scopeId: 'team-id',
      name: 'Print Team',
    },
  )
})

test('buildAddScopePayload creates a department scope from the selected department', () => {
  assert.deepEqual(
    buildAddScopePayload(
      { scopeId: 'dept-qc', name: '', code: 'DEPT-QC' },
      [{ id: 'dept-qc', name: 'QC', code: 'QC' }],
      [],
    ),
    {
      payload: {
        scopeType: 'department',
        scopeId: 'dept-qc',
        name: 'QC',
      },
      errorKey: null,
    },
  )
})

test('buildAddScopePayload creates a team scope by matching the team name under department', () => {
  assert.deepEqual(
    buildAddScopePayload(
      { scopeId: 'dept-qc', name: ' QC Team B ', code: 'TEAM-QC-02' },
      [{ id: 'dept-qc', name: 'QC', code: 'QC' }],
      [{ id: 'team-qc-b', name: 'QC Team B', departmentId: 'dept-qc' }],
    ),
    {
      payload: {
        scopeType: 'team',
        scopeId: 'team-qc-b',
        name: 'QC Team B',
      },
      errorKey: null,
    },
  )
})

test('buildAddScopePayload reports missing department and unknown team before API submit', () => {
  assert.deepEqual(buildAddScopePayload({ scopeId: '', name: '' }, [], []), {
    payload: null,
    errorKey: 'rbac.scopes.addModal.errors.departmentRequired',
  })

  assert.deepEqual(
    buildAddScopePayload(
      { scopeId: 'dept-qc', name: 'Unknown Team' },
      [{ id: 'dept-qc', name: 'QC' }],
      [{ id: 'team-qc-a', name: 'QC Team A', departmentId: 'dept-qc' }],
    ),
    {
      payload: null,
      errorKey: 'rbac.scopes.addModal.errors.teamNotFound',
    },
  )
})

test('getScopeTypeMeta returns token classes for scope type badges', () => {
  assert.equal(getScopeTypeMeta('team').labelKey, 'rbac.scopes.types.team')
  assert.match(getScopeTypeMeta('team').className, /!bg-success-bg/)
  assert.match(getScopeTypeMeta('department').className, /!bg-secondary-light/)
  assert.match(getScopeTypeMeta('shop').className, /!bg-warning-bg/)
  assert.match(getScopeTypeMeta('global').className, /!bg-primary-light/)
})

test('getScopeTypeLabel displays the raw API scopeType and falls back to unknown', () => {
  assert.equal(getScopeTypeLabel('shop'), 'shop')
  assert.equal(getScopeTypeLabel(' department '), 'department')
  assert.equal(getScopeTypeLabel(''), 'unknown')
  assert.equal(getScopeTypeLabel(null), 'unknown')
  assert.equal(getScopeTypeLabel(undefined), 'unknown')
})
