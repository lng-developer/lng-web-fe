import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('sidebar keeps every parent group expanded without an expand control', () => {
  const source = readFileSync(new URL('./AppSidebar.jsx', import.meta.url), 'utf8')

  assert.match(source, /\{renderItems\(item\.children, depth === 'root' \? 'group' : 'sub'\)\}/)
  assert.equal(source.includes('openItemsByContext'), false)
  assert.equal(source.includes('toggleItem'), false)
  assert.equal(source.includes('Collapse'), false)
  assert.equal(source.includes('ExpandLessIcon'), false)
  assert.equal(source.includes('ExpandMoreIcon'), false)
})

test('sidebar indents child navigation below its parent groups', () => {
  const source = readFileSync(new URL('./AppSidebar.jsx', import.meta.url), 'utf8')

  assert.match(
    source,
    /paddingLeft: theme\.spacing\(depth === 'sub' \? 6 : depth === 'group' \? 4 : 2\)/,
  )
})

test('sidebar renders root parent groups as non-interactive section labels without icons', () => {
  const source = readFileSync(new URL('./AppSidebar.jsx', import.meta.url), 'utf8')
  const parentBranch = source.slice(
    source.indexOf('if (item.children) {'),
    source.indexOf('return renderLeafItem'),
  )

  assert.match(
    parentBranch,
    /const isDomainLabel = depth === 'root' && item\.id !== 'catalog-group'/,
  )
  assert.match(parentBranch, /sx=\{\s*isDomainLabel\s*\? sectionLabelSx\s*: navButtonSx\(/)
  assert.match(parentBranch, /\{!isDomainLabel && \(\s*<Box className="SidebarNavIcon">/)
  assert.match(
    parentBranch,
    /<NavGlyph\s+icon=\{item\.id === 'catalog-group' \? 'catalog' : item\.icon\}/,
  )
})

test('sidebar uses the approved outlined icon language', () => {
  const source = readFileSync(new URL('./AppSidebar.jsx', import.meta.url), 'utf8')

  for (const icon of [
    'DashboardOutlinedIcon',
    'ShoppingCartOutlinedIcon',
    'ConstructionOutlinedIcon',
    'OutboxOutlinedIcon',
    'BrushOutlinedIcon',
    'BusinessOutlinedIcon',
    'PaymentsOutlinedIcon',
    'LinkOutlinedIcon',
    'AssessmentOutlinedIcon',
  ]) {
    assert.match(
      source,
      new RegExp(`import ${icon} from '@mui/icons-material/${icon.replace('Icon', '')}'`),
    )
  }
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

test('sidebar renders Portal navigation directly from the domain tree', () => {
  const source = readFileSync(new URL('./AppSidebar.jsx', import.meta.url), 'utf8')

  assert.match(source, /PORTAL_NAVIGATION/)
  assert.match(source, /filterNavigationByUser\(PORTAL_NAVIGATION, user\)/)
  assert.equal(source.includes('SIDEBAR_WORKSPACES'), false)
  assert.equal(source.includes('SIDEBAR_HOME_ITEM'), false)
  assert.equal(source.includes('SIDEBAR_WORKSPACE_NAVIGATION'), false)
  assert.equal(source.includes('SIDEBAR_WORKSPACES.flatMap'), false)
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
