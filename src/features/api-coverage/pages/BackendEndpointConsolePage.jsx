import { useTranslation } from 'react-i18next'

import BackendEndpointConsole from '@/features/api-coverage/components/BackendEndpointConsole'

const PRESETS = {
  audit: {
    descriptionKey: 'apiCoverage.presets.audit.description',
    moduleIds: ['audit'],
    titleKey: 'apiCoverage.presets.audit.title',
  },
  reports: {
    descriptionKey: 'apiCoverage.presets.reports.description',
    moduleIds: ['reports'],
    titleKey: 'apiCoverage.presets.reports.title',
  },
  shipments: {
    descriptionKey: 'apiCoverage.presets.shipments.description',
    moduleIds: ['shipments', 'vendor-submissions'],
    titleKey: 'apiCoverage.presets.shipments.title',
  },
}

export default function BackendEndpointConsolePage({ preset = 'all' }) {
  const { t } = useTranslation()
  const config = PRESETS[preset] || {
    descriptionKey: 'apiCoverage.presets.all.description',
    moduleIds: undefined,
    titleKey: 'apiCoverage.presets.all.title',
  }

  return (
    <BackendEndpointConsole
      description={t(config.descriptionKey)}
      moduleIds={config.moduleIds}
      title={t(config.titleKey)}
    />
  )
}
