export const DESIGN_TASK_SUB_TABS = {
  IDEA: 'idea',
  PSD: 'psd',
  PNG: 'png',
}

export const DESIGN_TASK_STATUS_TABS = {
  ALL: 'all',
  NEW: 'new',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'inProgress',
  UPLOADED: 'uploaded',
  QC_PASSED: 'qcPassed',
  QC_REJECTED: 'qcRejected',
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
