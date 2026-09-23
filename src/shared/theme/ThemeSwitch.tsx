import { useTranslation } from 'react-i18next'
import { MoonOutlined, SunOutlined } from '@ant-design/icons'
import { Button, Tooltip } from 'antd'

import { useThemePreference } from './themeContext'
import styles from './ThemeSwitch.module.scss'

export function ThemeSwitch() {
  const { t } = useTranslation()
  const { resolved, setAppearance } = useThemePreference()
  const isDark = resolved === 'dark'

  return (
    <Tooltip title={t('theme.label', { defaultValue: 'Appearance' })}>
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
    </Tooltip>
  )
}
