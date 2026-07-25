import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const componentFiles = [
  new URL('../components/MappingWorkspaceShell.jsx', import.meta.url),
  new URL('../components/ResolveQueueWorkspace.jsx', import.meta.url),
  new URL('../components/RuleInventoryWorkspace.jsx', import.meta.url),
]

function readMappingWorkspaceSource() {
  return [
    readFileSync(new URL('./MappingPage.jsx', import.meta.url), 'utf8'),
    ...componentFiles.map((file) => readFileSync(file, 'utf8')),
  ].join('\n')
}

test('MappingPage composes the shell and focused workspaces', () => {
  assert.equal(componentFiles.every(existsSync), true)

  const source = readMappingWorkspaceSource()

  assert.equal(source.includes('<MappingWorkspaceShell'), true)
  assert.equal(source.includes('<ResolveQueueWorkspace'), true)
  assert.equal(source.includes('<RuleInventoryWorkspace'), true)
  assert.equal(source.includes('setMappingTabInUrl'), true)
})

test('MappingPage uses a module workflow instead of the generic API workflow page', () => {
  const source = readMappingWorkspaceSource()

  assert.equal(source.includes('ApiWorkflowPage'), false)
})

test('MappingPage rule dialog does not render every backend field generically', () => {
  const source = readMappingWorkspaceSource()

  assert.equal(source.includes('Object.keys(blankRule)'), false)
})

test('MappingPage rule dialog shows a user-facing rule preview', () => {
  const source = readMappingWorkspaceSource()

  assert.equal(source.includes('buildMappingRulePreview'), true)
  assert.equal(source.includes('ArrowForwardIcon'), true)
  assert.equal(source.includes('(preview.changes || []).map'), true)
})

test('MappingPage rule dialog compares the current rule with the after-save preview', () => {
  const source = readMappingWorkspaceSource()

  assert.equal(source.includes('mapping.ruleDialog.current'), true)
  assert.equal(source.includes('mapping.ruleDialog.afterSave'), true)
})

test('MappingPage rule dialog separates required fields from advanced fields', () => {
  const source = readMappingWorkspaceSource()

  assert.equal(source.includes('mainFields'), true)
  assert.equal(source.includes('advancedFields'), true)
  assert.equal(source.includes('mapping.ruleDialog.howToFill'), true)
  assert.equal(source.includes('mapping.ruleDialog.advanced'), true)
})

test('MappingPage uses compact icon actions and tighter table spacing', () => {
  const source = readMappingWorkspaceSource()

  assert.equal(source.includes('IconButton'), true)
  assert.equal(source.includes('Tooltip'), true)
  assert.equal(source.includes("aria-label={t('mapping.actions.editRule')}"), true)
  assert.equal(source.includes('borderSpacing'), true)
  assert.equal(source.includes('size="small"'), true)
})

test('MappingPage uses status toggles instead of disable action buttons', () => {
  const source = readMappingWorkspaceSource()

  assert.equal(source.includes('role="switch"'), true)
  assert.equal(source.includes('Toggle rule status'), true)
  assert.equal(source.includes('Disable rule'), false)
  assert.equal(source.includes('Activate rule'), false)
  assert.equal(source.includes('BlockIcon'), false)
})

test('MappingPage rule table keeps actions right aligned with stable columns', () => {
  const source = readMappingWorkspaceSource()

  assert.equal(
    source.includes("gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) auto' }"),
    true,
  )
  assert.equal(source.includes('ruleTableColumnSx'), true)
  assert.equal(source.includes("tableLayout: 'fixed'"), true)
  assert.equal(source.includes('ruleStatusSwitchSx'), true)
})

test('MappingPage status switch uses explicit readable on and off styling', () => {
  const source = readMappingWorkspaceSource()

  assert.equal(source.includes('RuleStatusToggle'), true)
  assert.equal(source.includes('translateX(18px)'), true)
  assert.equal(source.includes("'success.main'"), true)
  assert.equal(source.includes("'action.disabledBackground'"), true)
})

test('MappingPage exposes search filters and pagination for mapping tables', () => {
  const source = readMappingWorkspaceSource()

  assert.equal(source.includes('TablePagination'), true)
  assert.equal(source.includes('mapping.filters.searchResolve'), true)
  assert.equal(source.includes('mapping.filters.searchRules'), true)
  assert.equal(source.includes('mapping.filters.ruleStatus'), true)
  assert.equal(source.includes('filterResolveQueueRows'), true)
})

test('MappingPage uses unmatched queue endpoint and one candidate selection action', () => {
  const source = readMappingWorkspaceSource()

  assert.equal(source.includes('useMappingUnmatchedOrderItemsQuery'), true)
  assert.equal(source.includes('useMappingWorkbenchQuery'), false)
  assert.equal(source.includes('useMappingConfirmMutation'), false)
  assert.equal(source.includes('confirmCandidate'), false)
})

test('MappingPage keeps active tab in the URL and lazy loads modal option APIs', () => {
  const source = readMappingWorkspaceSource()

  assert.equal(source.includes('getInitialMappingTab'), true)
  assert.equal(source.includes('setMappingTabInUrl'), true)
  assert.equal(source.includes("new URLSearchParams(window.location.search).get('tab')"), true)
  assert.equal(source.includes('enabled: Boolean(dialogState)'), true)
})

test('MappingPage resets per-tab table state when switching mapping tabs', () => {
  const source = readMappingWorkspaceSource()

  assert.equal(
    source.includes('<RuleInventoryWorkspace key={activeTab} ruleType={activeTab} />'),
    true,
  )
})
