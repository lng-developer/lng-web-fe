import { useState } from 'react'

import { mappingRuleTypes } from '@/features/mapping/api/mapping.queries'
import MappingWorkspaceShell from '@/features/mapping/components/MappingWorkspaceShell'
import ResolveQueueWorkspace from '@/features/mapping/components/ResolveQueueWorkspace'
import RuleInventoryWorkspace from '@/features/mapping/components/RuleInventoryWorkspace'

const tabIds = new Set(['resolve', ...mappingRuleTypes.map((tab) => tab.id)])

function getInitialMappingTab() {
  const tab = new URLSearchParams(window.location.search).get('tab')
  return tabIds.has(tab) ? tab : 'resolve'
}

function setMappingTabInUrl(tab) {
  const url = new URL(window.location.href)
  if (tab === 'resolve') url.searchParams.delete('tab')
  else url.searchParams.set('tab', tab)
  window.history.replaceState(null, '', url)
}

export default function MappingPage() {
  const [activeTab, setActiveTab] = useState(getInitialMappingTab)

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setMappingTabInUrl(tab)
  }

  return (
    <MappingWorkspaceShell activeTab={activeTab} onTabChange={handleTabChange}>
      {activeTab === 'resolve' ? (
        <ResolveQueueWorkspace />
      ) : (
        <RuleInventoryWorkspace key={activeTab} ruleType={activeTab} />
      )}
    </MappingWorkspaceShell>
  )
}
