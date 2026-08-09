import { startTransition } from 'react'
import { useTranslation } from 'react-i18next'
import { Segmented } from 'antd'

import type { Appearance } from './theme'
import { useThemePreference } from './themeContext'

export function ThemeSwitch() {
  const { t } = useTranslation()
  const { appearance, setAppearance } = useThemePreference()

  return (
    <Segmented<Appearance>
      aria-label={t('theme.label', { defaultValue: 'Appearance' })}
      value={appearance}
      onChange={(value) => startTransition(() => setAppearance(value))}
      options={[
        { label: t('theme.light', { defaultValue: 'Light' }), value: 'light' },
        { label: t('theme.dark', { defaultValue: 'Dark' }), value: 'dark' },
        { label: t('theme.system', { defaultValue: 'System' }), value: 'system' },
      ]}
    />
  )
}
