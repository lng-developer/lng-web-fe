import { useTranslation } from 'react-i18next'
import { MoonOutlined, SunOutlined } from '@ant-design/icons'
import { Button, Tooltip } from 'antd'

import { useThemePreference } from './themeContext'
import styles from './ThemeSwitch.module.scss'

type ThemeSwitchProps = {
  showTooltip?: boolean
}

export function ThemeSwitch({ showTooltip = true }: ThemeSwitchProps) {
  const { t } = useTranslation()
  const { resolved, setAppearance } = useThemePreference()
  const isDark = resolved === 'dark'

  const button = (
    <Button
      aria-label={t('theme.label', { defaultValue: 'Appearance' })}
      aria-pressed={isDark}
      className={styles.button}
      icon={
        isDark ? (
          <MoonOutlined key="moon" aria-hidden className={styles.icon} />
        ) : (
          <SunOutlined key="sun" aria-hidden className={styles.icon} />
        )
      }
      type="text"
      onClick={() => setAppearance(isDark ? 'light' : 'dark')}
    />
  )

  return showTooltip ? (
    <Tooltip title={t('theme.label', { defaultValue: 'Appearance' })}>{button}</Tooltip>
  ) : (
    button
  )
}
