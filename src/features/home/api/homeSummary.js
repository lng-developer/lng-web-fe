function sumValues(value = {}) {
  return Object.values(value).reduce((total, count) => total + (Number(count) || 0), 0)
}

export function mapHomeSummaryResponse(response = {}) {
  const orderItemsByStatus = response.orderItemsByStatus || {}
  const productionByStatus = response.productionByStatus || {}
  const productionBlockers = response.productionBlockers || {}
  const vendorSubmissionsByStatus = response.vendorSubmissionsByStatus || {}
  const shipmentsByStatus = response.shipmentsByStatus || {}

  return {
    totalUsers: null,
    totalOrders: sumValues(orderItemsByStatus),
    totalRevenue: null,
    queues: [
      {
        id: 'orders',
        count: sumValues(orderItemsByStatus),
        labelKey: 'home.queues.orders',
        statusKey: 'home.queueStatus.active',
      },
      {
        id: 'scale',
        count: Number(productionByStatus.NEED_SCALE) || 0,
        labelKey: 'home.queues.scale',
        statusKey: 'home.queueStatus.warning',
      },
      {
        id: 'qc',
        count: Number(productionByStatus.QC_PENDING) || 0,
        labelKey: 'home.queues.qc',
        statusKey: 'home.queueStatus.active',
      },
    ],
    exceptions: [
      {
        id: 'missing-psd',
        count: Number(productionBlockers.MISSING_PSD) || 0,
        labelKey: 'home.exceptions.missingPsd',
      },
      {
        id: 'shipping-hold',
        count: Number(shipmentsByStatus.TRACKING_PENDING) || 0,
        labelKey: 'home.exceptions.shippingHold',
      },
      {
        id: 'vendor-ready',
        count: Number(vendorSubmissionsByStatus.READY) || 0,
        labelKey: 'home.exceptions.vendorReady',
      },
    ],
  }
}
