import { TASK_TYPES } from '../../../constants/app.js'
import {
  DESIGN_TASK_ASIN_TYPE_FILTERS,
  DESIGN_TASK_PAGE_SIZE,
  DESIGN_TASK_SELLER_FILTERS,
  DESIGN_TASK_SHOP_FILTERS,
  DESIGN_TASK_STATUS_TABS,
} from '../constants/designTasksConstants.js'

const DELAY_MS = 350

const sampleTasks = [
  {
    id: 'design-task-001',
    createdAt: { date: '24 Jun 2026', relative: '4 days ago' },
    statusTask: 'New',
    linkProduct: 'etsy.com/listing/123...',
    assigned: 'Pending assign',
    seller: 'Acct',
    description: 'Custom tumbler design for wedding...',
    productType: 'T-Shirt',
  },
  {
    id: 'design-task-002',
    createdAt: { date: '23 Jun 2026', relative: '5 days ago' },
    statusTask: 'Assigned',
    linkProduct: 'etsy.com/listing/456...',
    assigned: 'Nam',
    seller: 'Main',
    description: 'Personalized ornament with family...',
    productType: 'Ornament',
  },
  {
    id: 'design-task-003',
    createdAt: { date: '22 Jun 2026', relative: '6 days ago' },
    statusTask: 'New',
    linkProduct: 'etsy.com/listing/789...',
    assigned: 'Pending assign',
    seller: 'Acct2',
    description: 'Blanket with custom pet photo print...',
    productType: 'T-Shirt',
  },
  {
    id: 'design-task-004',
    createdAt: { date: '21 Jun 2026', relative: '7 days ago' },
    statusTask: 'New',
    linkProduct: 'etsy.com/listing/012...',
    assigned: 'Hoa',
    seller: 'Main',
    description: 'Mug design - graduation 2026 theme...',
    productType: 'Ornament',
  },
  {
    id: 'design-task-005',
    createdAt: { date: '20 Jun 2026', relative: '8 days ago' },
    statusTask: 'New',
    linkProduct: 'etsy.com/listing/345...',
    assigned: 'Pending assign',
    seller: 'Acct',
    description: 'Canvas print - family portrait style...',
    productType: 'T-Shirt',
  },
]

const generatedTasks = Array.from({ length: 17 }, (_, index) => {
  const taskNumber = index + 6
  const productType = index % 2 === 0 ? 'T-Shirt' : 'Ornament'

  return {
    id: `design-task-${String(taskNumber).padStart(3, '0')}`,
    createdAt: {
      date: `${19 - (index % 5)} Jun 2026`,
      relative: `${9 + index} days ago`,
    },
    statusTask: 'New',
    linkProduct: `etsy.com/listing/${600 + index}...`,
    assigned: 'Pending assign',
    seller: index % 3 === 0 ? 'Acct' : index % 3 === 1 ? 'Main' : 'Acct2',
    description:
      productType === 'T-Shirt'
        ? 'Custom apparel design request...'
        : 'Personalized decor design request...',
    productType,
  }
})

let designTasks = [...sampleTasks, ...generatedTasks]

const psdTasksSeed = [
  {
    id: 'psd-task-001',
    createdAt: { date: '01 Jul 2026', relative: '2 days ago' },
    asin: 'B08Z4P8W5N',
    statusTask: 'Uploaded',
    assigned: 'Jane Cooper',
    priority: 'Medium',
    psdStatus: 'Available',
    seller: 'Global Shop',
    asinType: 'Normal',
    productTone: 'white',
  },
  {
    id: 'psd-task-002',
    createdAt: { date: '30 Jun 2026', relative: '3 days ago' },
    asin: 'B09X7Y2Z3A',
    statusTask: 'Uploaded',
    assigned: 'Nam Tran',
    priority: 'High',
    psdStatus: 'Available',
    seller: 'North Store',
    asinType: 'Variation',
    productTone: 'gray',
  },
  {
    id: 'psd-task-003',
    createdAt: { date: '29 Jun 2026', relative: '4 days ago' },
    asin: 'B07D9F8G1H',
    statusTask: 'In Progress',
    assigned: 'Alex Rivera',
    priority: 'Urgent',
    psdStatus: 'Draft',
    seller: 'East Market',
    asinType: 'Normal',
    productTone: 'navy',
  },
  {
    id: 'psd-task-004',
    createdAt: { date: '28 Jun 2026', relative: '5 days ago' },
    asin: 'B08K2L3M4N',
    statusTask: 'New',
    assigned: 'Mia Chen',
    priority: 'Easy',
    psdStatus: 'Available',
    seller: 'West Hub',
    asinType: 'Normal',
    productTone: 'blue',
  },
  {
    id: 'psd-task-005',
    createdAt: { date: '27 Jun 2026', relative: '6 days ago' },
    asin: 'B09P1Q2R3S',
    statusTask: 'New',
    assigned: 'Sam Lee',
    priority: 'Medium',
    psdStatus: 'Available',
    seller: 'Global Shop',
    asinType: 'Variation',
    productTone: 'green',
  },
]

let psdTasks = [...psdTasksSeed]

const pngTasksSeed = [
  {
    id: 'png-task-001',
    orderId: '#PNG-1042',
    orderDate: { date: '01 Jul 2026', relative: '2 days ago' },
    statusTask: 'Completed',
    scaleStatus: 'Complete',
    scaleBy: 'Jane Cooper',
    shop: 'Global Shop',
    orderStatus: 'Completed',
    orderOwner: 'Mia Chen',
    qcBy: 'Alex Rivera',
    express: 'No data',
    asinType: 'All',
    detail: {
      productInfo: {
        sku: 'B0GRMKNZNV',
        type: 'Normal',
        asin: 'J2522-WT-070326-103',
      },
      customization: {
        size: '60"x90"',
        customName: "Violeta's Bachelorette",
        customText: 'Last Sail Before the Veil',
        dateLocation: 'Palm Springs, CA',
        textColor: 'Sky',
        bgColor: 'Bay',
        priority: 'No, thanks!',
        url: 'Link',
        linkSp: 'x',
        customerPhoto: '-',
      },
      taskStatus: 'Complete',
      costCenter: {
        vendorProduct: 'Lenful - US Tapestry',
        size: '60"x90"',
      },
      notes: {
        cs: 'carrier:USPS',
        qc: '',
      },
      mockups: ['Front', 'Right Sleeve'],
      orderInfo: {
        seller: 'Nguyễn Phương Nam',
        quantity: 1,
        fulfillName: '113-1524195-6858656-163604606457041',
        buyerNote: '',
      },
    },
  },
  {
    id: 'png-task-002',
    orderId: '#PNG-1043',
    orderDate: { date: '30 Jun 2026', relative: '3 days ago' },
    statusTask: 'Completed',
    scaleStatus: 'Complete',
    scaleBy: 'Nam Tran',
    shop: 'North Store',
    orderStatus: 'Completed',
    orderOwner: 'Jane Cooper',
    qcBy: 'Mia Chen',
    express: 'No data',
    asinType: 'All',
    detail: null,
  },
]

let pngTasks = [...pngTasksSeed]

function wait(value) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), DELAY_MS)
  })
}

function matchesStatus(task, statusTab) {
  if (!statusTab || statusTab === DESIGN_TASK_STATUS_TABS.ALL) return true
  if (statusTab === DESIGN_TASK_STATUS_TABS.NEW) return task.statusTask === 'New'
  if (statusTab === DESIGN_TASK_STATUS_TABS.REQUESTED) return task.statusTask === 'Requested'
  if (statusTab === DESIGN_TASK_STATUS_TABS.ASSIGNED) return task.statusTask === 'Assigned'
  if (statusTab === DESIGN_TASK_STATUS_TABS.IN_PROGRESS) return task.statusTask === 'In Progress'
  if (statusTab === DESIGN_TASK_STATUS_TABS.UPLOADED) return task.statusTask === 'Uploaded'
  if (statusTab === DESIGN_TASK_STATUS_TABS.PENDING_ASSIGNMENT) {
    return task.statusTask === 'Pending Assignment'
  }
  if (statusTab === DESIGN_TASK_STATUS_TABS.NEED_SCALE) return task.statusTask === 'Need Scale'
  if (statusTab === DESIGN_TASK_STATUS_TABS.PENDING) return task.statusTask === 'Pending'
  if (statusTab === DESIGN_TASK_STATUS_TABS.COMPLETED) return task.statusTask === 'Completed'
  if (statusTab === DESIGN_TASK_STATUS_TABS.QC_PASSED) return task.statusTask === 'QC Passed'
  if (statusTab === DESIGN_TASK_STATUS_TABS.QC_REJECTED) return task.statusTask === 'QC Rejected'

  return true
}

function matchesSearch(task, search) {
  if (!search?.trim()) return true

  const keyword = search.trim().toLowerCase()
  return [
    task.createdAt?.date,
    task.orderId,
    task.orderDate?.date,
    task.statusTask,
    task.asin,
    task.shop,
    task.orderStatus,
    task.orderOwner,
    task.qcBy,
    task.linkProduct,
    task.assigned,
    task.priority,
    task.psdStatus,
    task.seller,
    task.asinType,
    task.description,
    task.productType,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(keyword))
}

export function getDesignTaskCounts() {
  return {
    [DESIGN_TASK_STATUS_TABS.ALL]: sampleTasks.length,
    [DESIGN_TASK_STATUS_TABS.NEW]: sampleTasks.filter((task) => task.statusTask === 'New').length,
    [DESIGN_TASK_STATUS_TABS.ASSIGNED]: sampleTasks.filter((task) => task.statusTask === 'Assigned')
      .length,
    [DESIGN_TASK_STATUS_TABS.IN_PROGRESS]: 0,
    [DESIGN_TASK_STATUS_TABS.UPLOADED]: 0,
    [DESIGN_TASK_STATUS_TABS.QC_PASSED]: 0,
    [DESIGN_TASK_STATUS_TABS.QC_REJECTED]: 0,
  }
}

function getPsdTaskCounts() {
  return {
    [DESIGN_TASK_STATUS_TABS.ALL]: 2,
    [DESIGN_TASK_STATUS_TABS.NEW]: 0,
    [DESIGN_TASK_STATUS_TABS.REQUESTED]: 0,
    [DESIGN_TASK_STATUS_TABS.ASSIGNED]: 0,
    [DESIGN_TASK_STATUS_TABS.IN_PROGRESS]: 0,
    [DESIGN_TASK_STATUS_TABS.UPLOADED]: 2,
    [DESIGN_TASK_STATUS_TABS.QC_REJECTED]: 0,
    [DESIGN_TASK_STATUS_TABS.QC_PASSED]: 0,
  }
}

function getPngTaskCounts() {
  return {
    [DESIGN_TASK_STATUS_TABS.ALL]: 2,
    [DESIGN_TASK_STATUS_TABS.PENDING_ASSIGNMENT]: 0,
    [DESIGN_TASK_STATUS_TABS.NEED_SCALE]: 0,
    [DESIGN_TASK_STATUS_TABS.PENDING]: 0,
    [DESIGN_TASK_STATUS_TABS.COMPLETED]: 2,
    [DESIGN_TASK_STATUS_TABS.QC_REJECTED]: 0,
  }
}

function matchesSeller(task, seller) {
  if (!seller || seller === DESIGN_TASK_SELLER_FILTERS.ALL) return true

  return task.seller === seller
}

function matchesShop(task, shop) {
  if (!shop || shop === DESIGN_TASK_SHOP_FILTERS.ALL) return true

  return task.shop === shop
}

function matchesAsinType(task, asinType) {
  if (!asinType || asinType === DESIGN_TASK_ASIN_TYPE_FILTERS.ALL) return true

  return task.asinType === asinType
}

function resolveTaskSet(subTab) {
  if (subTab === TASK_TYPES.PSD) {
    return {
      tasks: psdTasks,
      counts: getPsdTaskCounts(),
      summaryTotal: 2,
    }
  }

  if (subTab === TASK_TYPES.PNG) {
    return {
      tasks: pngTasks,
      counts: getPngTaskCounts(),
      summaryTotal: null,
      total: 22,
    }
  }

  return {
    tasks: designTasks,
    counts: getDesignTaskCounts(designTasks),
    summaryTotal: null,
  }
}

export function filterDesignTasks(tasks, filters = {}) {
  const page = Math.max(Number(filters.page) || 1, 1)
  const pageSize = Math.max(Number(filters.pageSize) || DESIGN_TASK_PAGE_SIZE, 1)
  const taskSet = Array.isArray(tasks)
    ? { tasks, counts: getDesignTaskCounts(tasks), summaryTotal: null, total: tasks.length }
    : resolveTaskSet(filters.subTab)
  const filtered = taskSet.tasks.filter(
    (task) =>
      matchesStatus(task, filters.statusTab) &&
      matchesSearch(task, filters.search) &&
      matchesSeller(task, filters.seller) &&
      matchesShop(task, filters.shop) &&
      matchesAsinType(task, filters.asinType),
  )
  const start = (page - 1) * pageSize

  return {
    items: filtered.slice(start, start + pageSize),
    total: taskSet.total ?? filtered.length,
    counts: taskSet.counts,
    summaryTotal: taskSet.summaryTotal,
    lastUpdatedAt: '10:46',
  }
}

export function fetchDesignTasks(filters = {}) {
  // TODO(api): thay mock bằng apiClient.get(ENDPOINTS.DESIGN.TASKS, { params: filters }).
  return wait(filterDesignTasks(undefined, filters))
}

export function resetDesignTasksForTest() {
  designTasks = [...sampleTasks, ...generatedTasks]
  psdTasks = [...psdTasksSeed]
  pngTasks = [...pngTasksSeed]
}
