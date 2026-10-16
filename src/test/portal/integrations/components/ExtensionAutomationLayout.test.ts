import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const stylesheet = readFileSync(
  resolve(
    process.cwd(),
    'src/features/portal/integrations/pages/IntegrationWorkbenchPage.module.scss',
  ),
  'utf8',
)

describe('Extension automation layout', () => {
  it('keeps agent cards wide enough for an automation row and becomes single-column on phones', () => {
    expect(stylesheet).toMatch(
      /\.automationGrid\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fit, minmax\(460px, 1fr\)\)/s,
    )
    expect(stylesheet).toMatch(
      /@media\s*\(max-width:\s*520px\)\s*\{[\s\S]*?\.automationGrid\s*\{[^}]*grid-template-columns:\s*1fr/s,
    )
  })
})
