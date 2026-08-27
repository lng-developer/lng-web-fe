import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const styles = readFileSync(
  join(
    process.cwd(),
    'src',
    'features',
    'portal',
    'production',
    'pages',
    'ProductionWorkbenchPage.module.scss',
  ),
  'utf8',
)

describe('ProductionWorkbenchPage detail layout', () => {
  it('keeps the upload column compact', () => {
    expect(styles).toMatch(/minmax\(\s*260px,\s*0\.9fr\s*\)/)
  })
})
