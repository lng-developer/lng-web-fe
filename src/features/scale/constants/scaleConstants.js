export const SCALE_SUB_TABS = {
  GROUP_TASK: 'groupTask',
  ETSY_TASKS: 'etsyTasks',
}

export const SCALE_CHANNELS = {
  AMAZON: 'AMAZON',
  ETSY: 'ETSY',
}

export const SCALE_STATUS_TABS = {
  ALL: 'all',
  CS_UNASSIGNED: 'csUnassigned',
  NEED_SCALE: 'needScale',
  PENDING: 'pending',
  COMPLETED: 'completed',
  QC_REJECTED: 'qcRejected',
  ADDRESS_INVALID: 'addressInvalid',
  FAILED: 'failed',
}

export const SCALE_STATUSES = {
  NEED_SCALE: 'NEED_SCALE',
  SENT: 'SENT',
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  QC_REJECTED: 'QC_REJECTED',
}

export const CS_STATUSES = {
  UNASSIGNED: 'UNASSIGNED',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
}

export const SCALE_PAGE_SIZE = 10

export const SCALE_PAGE_SIZE_OPTIONS = [10, 20, 50]

export const SCALE_ALL_FILTER = 'all'

export const ETSY_EXPANDED_TASK_ID = 'etsy-scale-task-ord-10039'

export const SCALE_TABLE_COLUMNS = [
  { id: 'expand', labelKey: '', width: 'w-[40px]' },
  { id: 'orderId', labelKey: 'scale.table.columns.orderId', width: 'w-[130px]' },
  { id: 'orderDate', labelKey: 'scale.table.columns.orderDate', width: 'w-[160px]' },
  { id: 'scaleStatus', labelKey: 'scale.table.columns.scaleStatus', width: 'w-[130px]' },
  { id: 'shop', labelKey: 'scale.table.columns.shop', width: 'w-[110px]' },
  { id: 'orderStatus', labelKey: 'scale.table.columns.orderStatus', width: 'w-[145px]' },
  { id: 'orderOwner', labelKey: 'scale.table.columns.orderOwner', width: 'w-[140px]' },
  { id: 'qcBy', labelKey: 'scale.table.columns.qcBy', width: 'w-[120px]' },
  { id: 'assignScale', labelKey: 'scale.table.columns.assignScale', width: 'w-[220px]' },
]

export const SCALE_TABLE_MIN_WIDTH = 1636
