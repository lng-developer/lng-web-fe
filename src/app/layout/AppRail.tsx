import { useTranslation } from 'react-i18next'
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
  ShopOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { Button, Tooltip } from 'antd'

import { brandAssets } from '@/shared/config/brandAssets'

import type { AppCoreKey } from './appNavigation'
import styles from './AppShell.module.scss'

const coreIcons = {
  portal: <ShopOutlined />,
  hr: <TeamOutlined />,
  system: <SettingOutlined />,
}

export function AppRail({
  cores,
  activeCore,
  contextCollapsed = false,
  onCoreChange,
  onContextCollapsedChange,
}: {
  cores: Array<{ key: AppCoreKey; labelKey: string }>
  activeCore?: AppCoreKey
  contextCollapsed?: boolean
  onCoreChange: (core: AppCoreKey) => void
  onContextCollapsedChange?: (collapsed: boolean) => void
}) {
  const { t } = useTranslation()
  return (
    <aside className={styles.rail} aria-label={t('shell.navigation.cores')}>
      <img className={styles.railBrand} src={brandAssets.logoWide} alt={t('app.name')} />
      <div className={styles.railItems}>
        {cores.map(({ key, labelKey }) => (
          <Tooltip key={key} title={t(labelKey)} placement="right">
            <Button
              className={key === activeCore ? styles.railButtonActive : styles.railButton}
              type="text"
              icon={coreIcons[key]}
              aria-label={t(labelKey)}
              aria-pressed={key === activeCore}
              onClick={() => onCoreChange(key)}
            />
          </Tooltip>
        ))}
      </div>
      {onContextCollapsedChange && (
        <Button
          className={styles.railCollapse}
          type="text"
          icon={contextCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          aria-label={t(contextCollapsed ? 'shell.expand' : 'shell.collapse')}
          onClick={() => onContextCollapsedChange(!contextCollapsed)}
        />
      )}
    </aside>
  )
}
