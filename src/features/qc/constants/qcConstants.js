export const QC_PLATFORM_TABS = {
  AMAZON: 'amazon',
  ETSY: 'etsy',
}

export const QC_STATUS_TABS = {
  ALL: 'all',
  PENDING: 'pending',
  QC_REJECTED: 'qcRejected',
  FAILED: 'failed',
  COMPLETED: 'completed',
  ADDRESS_INVALID: 'addressInvalid',
}

export const QC_PAGE_SIZE = 10

export const QC_ALL_FILTER = 'all'

export const QC_TABLE_COLUMNS = [
  { id: 'expand', labelKey: '' },
  { id: 'select', labelKey: '' },
  { id: 'orderId', labelKey: 'qc.table.columns.orderId' },
  { id: 'statusQc', labelKey: 'qc.table.columns.statusQc' },
  { id: 'created', labelKey: 'qc.table.columns.created' },
  { id: 'orderDate', labelKey: 'qc.table.columns.orderDate' },
  { id: 'statusOrder', labelKey: 'qc.table.columns.statusOrder' },
  { id: 'shippingType', labelKey: 'qc.table.columns.shippingType' },
  { id: 'shop', labelKey: 'qc.table.columns.shop' },
  { id: 'scaleBy', labelKey: 'qc.table.columns.scaleBy' },
  { id: 'qcBy', labelKey: 'qc.table.columns.qcBy' },
]

export const QC_DETAIL_COLUMNS = [
  { id: 'productInfo', labelKey: 'qc.detail.productInfo' },
  { id: 'scaleStatus', labelKey: 'qc.detail.scaleStatus' },
  { id: 'orderOwner', labelKey: 'qc.detail.orderOwner' },
  { id: 'fulfillName', labelKey: 'qc.detail.fulfillName' },
  { id: 'pngStatus', labelKey: 'qc.detail.pngStatus' },
  { id: 'vendorProduct', labelKey: 'qc.detail.vendorProduct' },
  { id: 'action', labelKey: 'qc.detail.action' },
]
