import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('sidebar keeps the active child group open after route navigation', () => {
  const source = readFileSync(new URL('./AppSidebar.jsx', import.meta.url), 'utf8')

  assert.match(source, /const isOpen = active \|\| Boolean\(openItems\[item\.id\]\)/)
  assert.match(source, /renderItems\(item\.items, 'root'\)/)
  assert.equal(source.includes('openItemsViewKey'), false)
})

test('sidebar uses route-derived Portal and HR context controls without a workspace rail', () => {
  const source = readFileSync(new URL('./AppSidebar.jsx', import.meta.url), 'utf8')

  assert.equal(source.includes("from 'react-router-dom'"), true)
  assert.match(source, /useNavigate/)
  assert.match(source, /getSidebarContextForLocation\(location\.pathname\)/)
  assert.match(source, /SIDEBAR_CONTEXTS\.filter/)
  assert.match(source, /aria-pressed=\{activeContext === context\.id\}/)
  assert.match(source, /getFirstNavigableItem\(contextNavigation\)/)
  assert.equal(source.includes('renderWorkspaceRail'), false)
  assert.equal(source.includes('workspaceButtonSx'), false)
})

test('sidebar does not route when the active context tab is clicked', () => {
  const source = readFileSync(new URL('./AppSidebar.jsx', import.meta.url), 'utf8')
  const guardIndex = source.indexOf('if (contextId === activeContext) return')
  const navigationIndex = source.indexOf(
    'const navigation =',
    source.indexOf('handleContextChange'),
  )

  assert.notEqual(guardIndex, -1)
  assert.equal(guardIndex < navigationIndex, true)
})

test('sidebar context tabs expose a visible keyboard focus state', () => {
  const source = readFileSync(new URL('./AppSidebar.jsx', import.meta.url), 'utf8')
  const contextButtonStyles = source.slice(
    source.indexOf('function contextButtonSx'),
    source.indexOf('function navButtonSx'),
  )

  assert.match(contextButtonStyles, /'&\.Mui-focusVisible':\s*\{[\s\S]*?(?:outline|boxShadow):/)
})
