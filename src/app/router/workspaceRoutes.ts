export const workspaceRoutePaths = {
  portal: {
    orders: 'portal/orders',
    teamTasks: 'portal/team-tasks',
    mapping: 'portal/mapping',
    production: 'portal/production',
    vendorSubmissions: 'portal/vendor-submissions',
    shipments: 'portal/shipments',
    integrations: 'portal/integrations',
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
  ordersBySalesChannel: (salesChannelCode: 'amazon' | 'etsy' | 'shopify') =>
    `/${workspaceRoutePaths.portal.orders}?salesChannelCode=${salesChannelCode}`,
} as const
