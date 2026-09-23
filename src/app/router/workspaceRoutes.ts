export const workspaceRoutePaths = {
  portal: {
    orders: 'portal/orders',
    teamTasks: 'portal/team-tasks',
    mapping: 'portal/mapping',
    production: 'portal/production',
    vendorSubmissions: 'portal/vendor-submissions',
    shipments: 'portal/shipments',
    integrations: 'portal/integrations',
    designIdeaTasks: 'portal/design/idea-tasks',
    designPsdTasks: 'portal/design/psd-tasks',
    designPngTasks: 'portal/design/png-tasks',
  },
} as const

export const workspaceRouteLinks = {
  orders: `/${workspaceRoutePaths.portal.orders}`,
  teamTasks: `/${workspaceRoutePaths.portal.teamTasks}`,
  mapping: `/${workspaceRoutePaths.portal.mapping}`,
  production: `/${workspaceRoutePaths.portal.production}`,
  vendorSubmissions: `/${workspaceRoutePaths.portal.vendorSubmissions}`,
  shipments: `/${workspaceRoutePaths.portal.shipments}`,
  integrations: `/${workspaceRoutePaths.portal.integrations}`,
  designIdeaTasks: `/${workspaceRoutePaths.portal.designIdeaTasks}`,
  designPsdTasks: `/${workspaceRoutePaths.portal.designPsdTasks}`,
  designPngTasks: `/${workspaceRoutePaths.portal.designPngTasks}`,
  ordersBySalesChannel: (salesChannelCode: 'amazon' | 'etsy' | 'shopify') =>
    `/${workspaceRoutePaths.portal.orders}?salesChannelCode=${salesChannelCode}`,
  designIdeaTasksBySalesChannel: (salesChannelCode: 'amazon' | 'etsy') =>
    `/${workspaceRoutePaths.portal.designIdeaTasks}?salesChannelCode=${salesChannelCode}`,
  designPsdTasksBySalesChannel: (salesChannelCode: 'amazon' | 'etsy') =>
    `/${workspaceRoutePaths.portal.designPsdTasks}?salesChannelCode=${salesChannelCode}`,
  designPngTasksBySalesChannel: (salesChannelCode: 'amazon' | 'etsy') =>
    `/${workspaceRoutePaths.portal.designPngTasks}?salesChannelCode=${salesChannelCode}`,
} as const
