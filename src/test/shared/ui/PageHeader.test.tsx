import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import i18n from '@/shared/i18n/i18n'
import { PageHeader } from '@/shared/ui'

describe('PageHeader', () => {
  afterEach(async () => {
    cleanup()
    await i18n.changeLanguage('vi')
  })

  it('renders the update label in the active language', async () => {
    await i18n.changeLanguage('en')
    render(<PageHeader title="Foundation" updatedAt="2026-08-04T03:00:00.000Z" />)

    expect(screen.getByText(/Updated at\b/)).toBeVisible()
  })
})
