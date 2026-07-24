import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('sidebar renders expandable parent groups with expand controls', () => {
  const source = readFileSync(new URL('./AppSidebar.jsx', import.meta.url), 'utf8')

  assert.match(source, /useState/)
  assert.match(source, /Collapse/)
  assert.match(source, /ExpandMoreIcon/)
  assert.match(source, /aria-expanded=\{isOpen\}/)
  assert.match(source, /<Collapse in=\{isOpen\} timeout=\{160\} unmountOnExit>/)
})

test('sidebar maps the System icon and uses lightweight expand motion', () => {
  const source = readFileSync(new URL('./AppSidebar.jsx', import.meta.url), 'utf8')

  assert.match(source, /admin: SettingsOutlinedIcon/)
  assert.match(source, /transform: isOpen \? 'rotate\(180deg\)' : 'rotate\(0deg\)'/)
  assert.equal(source.includes('SIDEBAR_PREVIEW_MODES'), false)
  assert.equal(source.includes('PREVIEW_BADGES'), false)
  assert.equal(source.includes('<Popper'), false)
})

test('sidebar keeps parent groups collapsed until the user opens one', () => {
  const source = readFileSync(new URL('./AppSidebar.jsx', import.meta.url), 'utf8')

  assert.match(source, /const isOpen = openItemsById\[item\.id\] \?\? false/)
  assert.equal(source.includes('Boolean(item.defaultOpen || active)'), false)
})

test('sidebar indents child navigation below its parent groups', () => {
  const source = readFileSync(new URL('./AppSidebar.jsx', import.meta.url), 'utf8')

  assert.match(
    source,
    /paddingLeft: theme\.spacing\(depth === 'sub' \? 6 : depth === 'group' \? 4 : 2\)/,
  )
})

test('sidebar renders icons only for parent groups and root-level leaf items', () => {
  const source = readFileSync(new URL('./AppSidebar.jsx', import.meta.url), 'utf8')
  const parentBranch = source.slice(
    source.indexOf('if (item.children) {'),
    source.indexOf('return renderLeafItem'),
  )

  assert.match(parentBranch, /<NavGlyph icon=\{item\.icon\} active=\{active\} \/>/)
  assert.match(source, /\{depth === 'root' && \(\s*<Box className="SidebarNavIcon">/)
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
