import BackendEndpointConsole from '@/features/api-coverage/components/BackendEndpointConsole'

const PRESETS = {
  audit: {
    description: 'Read-only audit module surface. Backend currently exposes health only.',
    moduleIds: ['audit'],
    title: 'Audit API',
  },
  reports: {
    description: 'Operational reports from finance, vendor, and operations backend endpoints.',
    moduleIds: ['reports'],
    title: 'Reports API',
  },
  shipments: {
    description:
      'Shipment queue, vendor webhook logs, tracking updates, and vendor submission actions.',
    moduleIds: ['shipments', 'vendor-submissions'],
    title: 'Shipping & Vendor Submissions API',
  },
}

export default function BackendEndpointConsolePage({ preset = 'all' }) {
  const config = PRESETS[preset] || {
    description: 'All backend non-health endpoints available through the shared API client.',
    moduleIds: undefined,
    title: 'Backend API Console',
  }

  return <BackendEndpointConsole {...config} />
}
