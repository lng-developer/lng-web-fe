import { describe, expect, it } from 'vitest'

import en from '@/shared/i18n/locales/en/common.json'
import vi from '@/shared/i18n/locales/vi/common.json'

function flatten(value: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(value).flatMap(([key, entry]) => {
    const path = prefix ? `${prefix}.${key}` : key

    return entry && typeof entry === 'object' && !Array.isArray(entry)
      ? flatten(entry as Record<string, unknown>, path)
      : path
  })
}

describe('foundation locales', () => {
  it('keeps Vietnamese and English keys in parity', () => {
    expect(flatten(vi).sort()).toEqual(flatten(en).sort())
  })

  it('contains every foundation key', () => {
    expect(flatten(vi)).toEqual(
      expect.arrayContaining([
        'app.name',
        'language.vi',
        'language.en',
        'foundation.eyebrow',
        'foundation.title',
        'foundation.description',
        'foundation.sections.controls',
        'foundation.status.operational',
        'foundation.empty.title',
        'shell.navigation.primary',
        'theme.light',
        'theme.dark',
        'theme.system',
        'errors.unexpected',
        'notFound.title',
        'notFound.backHome',
        'hrOperations.title',
        'hrOperations.schedule.title',
        'hrOperations.attendance.title',
        'hrOperations.requests.title',
        'hrOperations.payroll.title',
        'hrOperations.overview.title',
      ]),
    )
  })
})
