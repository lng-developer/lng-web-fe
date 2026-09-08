export const workspaceRoutePaths = {
  portal: {
    orders: 'portal/orders',
    teamTasks: 'portal/team-tasks',
  },
} as const

export const workspaceRouteLinks = {
  orders: `/${workspaceRoutePaths.portal.orders}`,
  teamTasks: `/${workspaceRoutePaths.portal.teamTasks}`,
  ordersBySalesChannel: (salesChannelCode: 'amazon' | 'etsy' | 'shopify') =>
    `/${workspaceRoutePaths.portal.orders}?salesChannelCode=${salesChannelCode}`,
} as const
