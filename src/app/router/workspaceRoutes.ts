export const workspaceRoutePaths = {
  portal: {
    listingLaunches: 'portal/catalog/listing-launches',
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
  listingLaunches: `/${workspaceRoutePaths.portal.listingLaunches}`,
  listingLaunchDetail: (id: string) =>
    `/${workspaceRoutePaths.portal.listingLaunches}/${encodeURIComponent(id)}`,
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
