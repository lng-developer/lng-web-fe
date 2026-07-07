import {
  DESIGN_TASK_PAGE_SIZE,
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

function wait(value) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), DELAY_MS)
  })
}

function matchesStatus(task, statusTab) {
  if (!statusTab || statusTab === DESIGN_TASK_STATUS_TABS.ALL) return true
  if (statusTab === DESIGN_TASK_STATUS_TABS.NEW) return task.statusTask === 'New'
  if (statusTab === DESIGN_TASK_STATUS_TABS.ASSIGNED) return task.statusTask === 'Assigned'
  if (statusTab === DESIGN_TASK_STATUS_TABS.IN_PROGRESS) return task.statusTask === 'In Progress'
  if (statusTab === DESIGN_TASK_STATUS_TABS.UPLOADED) return task.statusTask === 'Uploaded'
  if (statusTab === DESIGN_TASK_STATUS_TABS.QC_PASSED) return task.statusTask === 'QC Passed'
  if (statusTab === DESIGN_TASK_STATUS_TABS.QC_REJECTED) return task.statusTask === 'QC Rejected'

  return true
}

function matchesSearch(task, search) {
  if (!search?.trim()) return true

  const keyword = search.trim().toLowerCase()
  return [
    task.createdAt.date,
    task.statusTask,
    task.linkProduct,
    task.assigned,
    task.seller,
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

export function filterDesignTasks(tasks = designTasks, filters = {}) {
  const page = Math.max(Number(filters.page) || 1, 1)
  const pageSize = Math.max(Number(filters.pageSize) || DESIGN_TASK_PAGE_SIZE, 1)
  const filtered = tasks.filter(
    (task) => matchesStatus(task, filters.statusTab) && matchesSearch(task, filters.search),
  )
  const start = (page - 1) * pageSize

  return {
    items: filtered.slice(start, start + pageSize),
    total: filtered.length,
    counts: getDesignTaskCounts(tasks),
    lastUpdatedAt: '10:46',
  }
}

export function fetchDesignTasks(filters = {}) {
  // TODO(api): thay mock bằng apiClient.get(ENDPOINTS.DESIGN.TASKS, { params: filters }).
  return wait(filterDesignTasks(designTasks, filters))
}

export function resetDesignTasksForTest() {
  designTasks = [...sampleTasks, ...generatedTasks]
}
