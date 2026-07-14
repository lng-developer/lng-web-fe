import { QC_ALL_FILTER, QC_PAGE_SIZE, QC_STATUS_TABS } from '../constants/qcConstants.js'

const DELAY_MS = 350

export const qcSellers = ['Nguyễn Phương Nam', 'Dao Quang Tung', 'Dang Thanh Trung']
export const qcShops = ['Acct', 'Acct2', 'Main']

function wait(value) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), DELAY_MS)
  })
}

function buildDetail(overrides = {}) {
  return {
    product: {
      sku: 'J2S22-WT-070326-109',
      asin: 'B0GRMBFHDD',
      quantity: 1,
      imageUrl: null,
    },
    scaleStatus: 'Complete',
    orderOwner: 'Nguyễn Phương Nam',
    fulfillName: '111-1432051-0226621-163934307644241',
    pngStatus: 'Available',
    vendorProduct: 'Lenful - US Tapestry',
    ...overrides,
  }
}

function createTask(index, overrides = {}) {
  const statusQc = overrides.statusQc || 'Complete'
  const statusOrder = overrides.statusOrder || (index % 3 === 0 ? 'Processing' : 'Shipped')
  const shop = overrides.shop || (index % 3 === 0 ? 'Acct' : index % 3 === 1 ? 'Main' : 'Acct2')
  const seller = overrides.seller || 'Nguyễn Phương Nam'

  return {
    id: overrides.id || `qc-task-${index}`,
    orderId: overrides.orderId || `ORD-${20000 + index}`,
    statusQc,
    created: overrides.created || {
      date: `${22 + (index % 5)} Jun 2026`,
      relative: `${index + 1} days ago`,
    },
    orderDate: overrides.orderDate || {
      date: `${16 + (index % 5)} Jun 2026`,
      relative: `${index + 7} days ago`,
    },
    statusOrder,
    shippingType: overrides.shippingType || (index % 2 === 0 ? 'Standard' : 'Express'),
    shop,
    seller,
    scaleBy: overrides.scaleBy || (index % 2 === 0 ? 'Nam' : 'Hoa'),
    qcBy: overrides.qcBy || (index % 2 === 0 ? 'Lan' : 'Tuan'),
    detail: buildDetail(overrides.detail),
  }
}

const seededTasks = [
  createTask(41, {
    id: 'qc-task-ord-20041',
    orderId: 'ORD-20041',
    statusQc: 'Pending',
    created: { date: '26 Jun 2026', relative: '2 days ago' },
    orderDate: { date: '20 Jun 2026', relative: '8 days ago' },
    statusOrder: 'Processing',
    shippingType: 'Standard',
    shop: 'Acct',
    scaleBy: 'Nam',
    qcBy: 'Lan',
  }),
  createTask(39, {
    id: 'qc-task-ord-20039',
    orderId: 'ORD-20039',
    statusQc: 'Complete',
    created: { date: '25 Jun 2026', relative: '3 days ago' },
    orderDate: { date: '19 Jun 2026', relative: '9 days ago' },
    statusOrder: 'Shipped',
    shippingType: 'Express',
    shop: 'Main',
    scaleBy: 'Hoa',
    qcBy: 'Tuan',
  }),
  createTask(35, {
    id: 'qc-task-ord-20035',
    orderId: 'ORD-20035',
    statusQc: 'Failed',
    created: { date: '22 Jun 2026', relative: '6 days ago' },
    orderDate: { date: '16 Jun 2026', relative: '12 days ago' },
    statusOrder: 'Delivered',
    shippingType: 'Express',
    shop: 'Acct2',
    scaleBy: 'Duc',
    qcBy: 'Mai',
  }),
]

const generatedTasks = Array.from({ length: 19 }, (_, index) =>
  createTask(index + 1, {
    statusQc: 'Complete',
    statusOrder: index % 2 === 0 ? 'Shipped' : 'Delivered',
    seller:
      index % 3 === 0
        ? 'Nguyễn Phương Nam'
        : index % 3 === 1
          ? 'Dao Quang Tung'
          : 'Dang Thanh Trung',
  }),
)

let qcTasks = [...seededTasks, ...generatedTasks]

function isUnset(value) {
  return !value || value === QC_ALL_FILTER
}

function matchesSearch(task, search) {
  if (!search?.trim()) return true

  const keyword = search.trim().toLowerCase()
  return [
    task.orderId,
    task.statusQc,
    task.statusOrder,
    task.shippingType,
    task.shop,
    task.seller,
    task.scaleBy,
    task.qcBy,
    task.detail.product.sku,
    task.detail.product.asin,
    task.detail.fulfillName,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(keyword))
}

function matchesStatus(task, statusTab) {
  if (!statusTab || statusTab === QC_STATUS_TABS.ALL) return true
  if (statusTab === QC_STATUS_TABS.PENDING) return task.statusQc === 'Pending'
  if (statusTab === QC_STATUS_TABS.QC_REJECTED) return task.statusQc === 'QC Rejected'
  if (statusTab === QC_STATUS_TABS.FAILED) return task.statusQc === 'Failed'
  if (statusTab === QC_STATUS_TABS.COMPLETED) {
    return ['Complete', 'Pending'].includes(task.statusQc) || task.statusOrder === 'Delivered'
  }
  if (statusTab === QC_STATUS_TABS.ADDRESS_INVALID) return task.statusOrder === 'Address Invalid'

  return true
}

export function getQcCounts(tasks = qcTasks) {
  return {
    [QC_STATUS_TABS.ALL]: tasks.length,
    [QC_STATUS_TABS.PENDING]: 0,
    [QC_STATUS_TABS.QC_REJECTED]: 0,
    [QC_STATUS_TABS.FAILED]: tasks.filter((task) => task.statusQc === 'Failed').length,
    [QC_STATUS_TABS.COMPLETED]: tasks.filter(
      (task) => ['Complete', 'Pending'].includes(task.statusQc) || task.statusOrder === 'Delivered',
    ).length,
    [QC_STATUS_TABS.ADDRESS_INVALID]: tasks.filter((task) => task.statusOrder === 'Address Invalid')
      .length,
  }
}

export function getQcFilterOptions(tasks = qcTasks) {
  return {
    sellers: [...new Set(tasks.map((task) => task.seller))],
    shops: [...new Set(tasks.map((task) => task.shop))],
  }
}

export function filterQcTasks(tasks = qcTasks, filters = {}) {
  const page = Math.max(Number(filters.page) || 1, 1)
  const pageSize = Math.max(Number(filters.pageSize) || QC_PAGE_SIZE, 1)
  const filtered = tasks.filter((task) => {
    return (
      matchesStatus(task, filters.statusTab) &&
      matchesSearch(task, filters.search) &&
      (isUnset(filters.seller) || task.seller === filters.seller) &&
      (isUnset(filters.shop) || task.shop === filters.shop)
    )
  })
  const start = (page - 1) * pageSize

  return {
    items: filtered.slice(start, start + pageSize),
    total: filtered.length,
    counts: getQcCounts(tasks),
    options: getQcFilterOptions(tasks),
    lastUpdatedAt: '10:46',
  }
}

export function fetchQcTasks(filters = {}) {
  // TODO(api): thay mock bằng apiClient.get(ENDPOINTS.QC.TASKS, { params: filters }).
  return wait(filterQcTasks(qcTasks, filters))
}

export function resetQcTasksForTest() {
  qcTasks = [...seededTasks, ...generatedTasks]
}
