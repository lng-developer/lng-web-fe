import { useTranslation } from 'react-i18next'
import { Tab, Tabs } from '@mui/material'

import { TASK_TYPE_TAB_OPTIONS } from './taskTypeTabsConfig'

export default function TaskTypeTabs({ value, onChange }) {
  const { t } = useTranslation()

  return (
    <Tabs
      value={value}
      onChange={(_event, nextValue) => onChange(nextValue)}
      TabIndicatorProps={{ className: 'h-0.5 bg-primary' }}
      className="!min-h-11 border-b border-border"
    >
      {TASK_TYPE_TAB_OPTIONS.map((tab) => {
        const active = value === tab.value

        return (
          <Tab
            key={tab.value}
            value={tab.value}
            label={t(tab.labelKey)}
            disableRipple
            className={`!min-h-11 !px-3 !text-sm !normal-case transition-colors ${
              active ? '!font-semibold !text-ink' : '!font-medium !text-ink-muted hover:!text-ink'
            }`}
          />
        )
      })}
    </Tabs>
  )
}
