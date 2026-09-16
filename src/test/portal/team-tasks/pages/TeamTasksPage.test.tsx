import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { TeamTasksPage } from '@/features/portal/team-tasks/pages/TeamTasksPage'
import i18n from '@/shared/i18n/i18n'

describe('TeamTasksPage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('shows the feature-under-development notice in the content area', () => {
    render(
      <AppProviders>
        <TeamTasksPage />
      </AppProviders>,
    )

    expect(screen.getByRole('heading', { name: 'Team Tasks is under development' })).toBeVisible()
    expect(screen.getByRole('img', { name: '404 page not found illustration' })).toBeVisible()
  })
})
