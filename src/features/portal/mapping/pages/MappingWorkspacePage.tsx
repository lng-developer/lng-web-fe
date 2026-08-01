import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { Tabs } from 'antd'

import { MAPPING_RULE_PAGES } from '../model/mappingPageConfig'
import { MappingRulePage } from './MappingRulePage'
import { MappingWorkbenchPage } from './MappingWorkbenchPage'

const WORKBENCH = 'workbench'

export function MappingWorkspacePage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const activeTab =
    requestedTab &&
    (requestedTab === WORKBENCH || MAPPING_RULE_PAGES.some(({ key }) => key === requestedTab))
      ? requestedTab
      : WORKBENCH

  return (
    <Tabs
      activeKey={activeTab}
      destroyOnHidden
      items={[
        {
          key: WORKBENCH,
          label: t('mapping.pages.workbench'),
          children: <MappingWorkbenchPage />,
        },
        ...MAPPING_RULE_PAGES.map((page) => ({
          key: page.key,
          label: t(page.titleKey),
          children: <MappingRulePage pageKey={page.key} />,
        })),
      ]}
      onChange={(tab) => {
        const next = new URLSearchParams(searchParams)
        next.set('tab', tab)
        setSearchParams(next)
      }}
    />
  )
}

export default MappingWorkspacePage
