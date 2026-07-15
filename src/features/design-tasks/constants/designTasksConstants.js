import { TASK_TYPES } from '../../../constants/app.js'

export const DESIGN_TASK_SUB_TABS = TASK_TYPES

export const DESIGN_TASK_STATUS_TABS = {
  ALL: 'all',
  NEW: 'new',
  REQUESTED: 'requested',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'inProgress',
  UPLOADED: 'uploaded',
  PENDING_ASSIGNMENT: 'pendingAssignment',
  NEED_SCALE: 'needScale',
  PENDING: 'pending',
  COMPLETED: 'completed',
  QC_PASSED: 'qcPassed',
  QC_REJECTED: 'qcRejected',
}

export const DESIGN_TASK_SELLER_FILTERS = {
  ALL: 'all',
}

export const DESIGN_TASK_SHOP_FILTERS = {
  ALL: 'all',
}

export const DESIGN_TASK_ASIN_TYPE_FILTERS = {
  ALL: 'all',
}

export const DESIGN_TASK_PAGE_SIZE = 10

export const DESIGN_TASK_TABLE_COLUMNS = [
  { id: 'createdAt', labelKey: 'designTasks.table.columns.createdAt' },
  { id: 'productImage', labelKey: 'designTasks.table.columns.productImage' },
  { id: 'statusTask', labelKey: 'designTasks.table.columns.statusTask' },
  { id: 'linkProduct', labelKey: 'designTasks.table.columns.linkProduct' },
  { id: 'assigned', labelKey: 'designTasks.table.columns.assigned' },
  { id: 'seller', labelKey: 'designTasks.table.columns.seller' },
  { id: 'description', labelKey: 'designTasks.table.columns.description' },
  { id: 'productType', labelKey: 'designTasks.table.columns.productType' },
  { id: 'actions', labelKey: 'designTasks.table.columns.actions' },
  { id: 'editDelete', labelKey: 'designTasks.table.columns.editDelete' },
]

export const PSD_TASK_TABLE_COLUMNS = [
  { id: 'createdAt', labelKey: 'designTasks.psd.table.columns.createdAt' },
  { id: 'productImage', labelKey: 'designTasks.psd.table.columns.productImage' },
  { id: 'asin', labelKey: 'designTasks.psd.table.columns.asin' },
  { id: 'statusTask', labelKey: 'designTasks.psd.table.columns.statusTask' },
  { id: 'assigned', labelKey: 'designTasks.psd.table.columns.assigned' },
  { id: 'priority', labelKey: 'designTasks.psd.table.columns.priority' },
  { id: 'psdStatus', labelKey: 'designTasks.psd.table.columns.psdStatus' },
  { id: 'seller', labelKey: 'designTasks.psd.table.columns.seller' },
  { id: 'asinType', labelKey: 'designTasks.psd.table.columns.asinType' },
  { id: 'actions', labelKey: 'designTasks.psd.table.columns.actions' },
]

export const PNG_TASK_TABLE_COLUMNS = [
  { id: 'expand', labelKey: 'designTasks.png.table.columns.expand' },
  { id: 'orderId', labelKey: 'designTasks.png.table.columns.orderId' },
  { id: 'orderDate', labelKey: 'designTasks.png.table.columns.orderDate' },
  { id: 'scaleStatus', labelKey: 'designTasks.png.table.columns.scaleStatus' },
  { id: 'scaleBy', labelKey: 'designTasks.png.table.columns.scaleBy' },
  { id: 'shop', labelKey: 'designTasks.png.table.columns.shop' },
  { id: 'orderStatus', labelKey: 'designTasks.png.table.columns.orderStatus' },
  { id: 'orderOwner', labelKey: 'designTasks.png.table.columns.orderOwner' },
  { id: 'qcBy', labelKey: 'designTasks.png.table.columns.qcBy' },
  { id: 'express', labelKey: 'designTasks.png.table.columns.express' },
  { id: 'action', labelKey: 'designTasks.png.table.columns.action' },
]
