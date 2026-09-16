import { useTranslation } from 'react-i18next'
import { MoonOutlined, SunOutlined } from '@ant-design/icons'
import { Switch } from 'antd'

import { useThemePreference } from './themeContext'

export function ThemeSwitch() {
  const { t } = useTranslation()
  const { resolved, setAppearance } = useThemePreference()

  return (
    <Switch
      aria-label={t('theme.label', { defaultValue: 'Appearance' })}
      checked={resolved === 'dark'}
      checkedChildren={<MoonOutlined aria-hidden />}
      unCheckedChildren={<SunOutlined aria-hidden />}
      onChange={(checked) => setAppearance(checked ? 'dark' : 'light')}
    />
  )
}
