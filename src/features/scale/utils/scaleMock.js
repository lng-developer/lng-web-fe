import {
  CS_STATUSES,
  SCALE_ALL_FILTER,
  SCALE_PAGE_SIZE,
  SCALE_STATUS_TABS,
  SCALE_STATUSES,
} from '../constants/scaleConstants.js'

const DELAY_MS = 400

export const scaleCsUsers = [
  { id: 'unassigned', name: 'Unassigned' },
  { id: 'cs-anna', name: 'Anna CS' },
  { id: 'cs-minh', name: 'Minh Tran' },
  { id: 'cs-linh', name: 'Linh Nguyen' },
  { id: 'cs-jade', name: 'Jade Pham' },
]

const baseProducts = [
  {
    name: 'Custom Comfort Colors Shirt',
    sku: 'CC1717-PER',
    asin: 'B0C1717PER',
    variant: 'Pepper / M',
    fulfillName: 'UT-1717-PER-M',
  },
  {
    name: 'Personalized Embroidered Sweatshirt',
    sku: 'SW9200-EMB',
    asin: 'B0SW9200EM',
    variant: 'Sand / L',
    fulfillName: 'SW-9200-SAN-L',
  },
  {
    name: 'Custom Family Photo Ornament',
    sku: 'ORN-2026-FAM',
    asin: 'B0ORN2026',
    variant: 'Round / Ceramic',
    fulfillName: 'ORN-CER-ROUND',
  },
]

function buildDetail(index, overrides = {}) {
  const product = baseProducts[index % baseProducts.length]
  const [color, size] = product.variant.split(' / ')
  const vendor = index % 2 === 0 ? 'Monster Digital' : 'SwiftPOD'

  return {
    product: {
      ...product,
      primaryCode: product.asin,
      secondaryCode: product.sku,
      psdStatus: 'NORMAL',
      quantity: (index % 3) + 1,
      imageUrl: 'https://res.cloudinary.com/drnzb64by/image/upload/v1773214517/logo_juyfbo.jpg',
    },
    customization: [
      { label: 'Choose Your Size:', value: size, type: 'text' },
      { label: 'Custom Name:', value: index % 2 === 0 ? 'MIA' : 'DAD & JONAS', type: 'text' },
      { label: 'Custom Text:', value: product.name, type: 'text' },
      { label: 'Date/Location:', value: 'Austin, TX', type: 'text' },
      { label: 'Text Color:', value: color, type: 'text' },
      { label: 'BG Color:', value: 'Neutral', type: 'text' },
      { label: 'Priority:', value: index % 2 === 0 ? 'No, thanks!' : 'Need review', type: 'text' },
      { label: 'URL:', value: 'Link', type: 'link', url: 'https://amazon.com' },
      { label: 'Link SP:', value: 'x', type: 'danger' },
      {
        label: 'Customer Photo:',
        value: '-',
        type: 'image',
        url: 'https://res.cloudinary.com/drnzb64by/image/upload/v1773214517/logo_juyfbo.jpg',
      },
    ],
    taskStatus: {
      mapping: index % 2 === 0 ? 'Ready' : 'Checking',
      scale: overrides.scaleStatus || SCALE_STATUSES.NEED_SCALE,
      qc: overrides.scaleStatus === SCALE_STATUSES.QC_REJECTED ? 'Rejected' : 'Waiting',
    },
    costCenter: {
      vendorProduct: `${vendor} - ${product.fulfillName}`,
      size: product.variant,
      sku: product.fulfillName,
      baseCost: `$${(8.75 + index).toFixed(2)}`,
      vendor,
    },
    notes: {
      cs:
        index % 2 === 0
          ? 'Please confirm customer photo crop before scale.'
          : 'Need CS check personalization spelling.',
      qc: '-',
    },
    csNote:
      index % 2 === 0
        ? 'Please confirm customer photo crop before scale.'
        : 'Need CS check personalization spelling.',
    mockups: [],
  }
}

function createTask(index, overrides = {}) {
  const scaleStatus = overrides.scaleStatus || SCALE_STATUSES.NEED_SCALE
  const csBy = overrides.csBy || 'unassigned'
  const csStatus =
    overrides.csStatus || (csBy === 'unassigned' ? CS_STATUSES.UNASSIGNED : CS_STATUSES.ASSIGNED)
  const orderNumber = 10020 + index

  return {
    id: overrides.id || `scale-task-${index}`,
    orderId: `ORD-${orderNumber}`,
    orderDate: `2026-07-${String((index % 9) + 1).padStart(2, '0')} 09:${String(
      (index * 7) % 60,
    ).padStart(2, '0')}`,
    scaleStatus,
    groupId: overrides.groupId || `GR-${200 + index}`,
    groupType: overrides.groupType || (index % 2 === 0 ? 'Fulfillment' : 'Mockup'),
    shop: overrides.shop || (index % 3 === 0 ? 'LNG Group' : index % 3 === 1 ? 'Tan Tan' : 'FBA'),
    seller: overrides.seller || (index % 2 === 0 ? 'Dao Quang Tung' : 'Dang Thanh Trung'),
    orderStatus:
      overrides.orderStatus || (scaleStatus === SCALE_STATUSES.COMPLETED ? 'Ready' : 'Processing'),
    orderOwner: overrides.orderOwner || (index % 2 === 0 ? 'Nguyen Duc Son' : 'Vo Minh Tri'),
    qcBy: overrides.qcBy || (index % 3 === 0 ? 'QC Hoa' : 'QC An'),
    csBy,
    csStatus,
    detail: buildDetail(index, { scaleStatus }),
  }
}

const seededTasks = [
  createTask(22, {
    id: 'scale-task-ord-10042',
    orderId: 'ORD-10042',
    scaleStatus: SCALE_STATUSES.NEED_SCALE,
    groupId: 'GR-342',
    groupType: 'Fulfillment',
    shop: 'LNG Group',
    seller: 'Dao Quang Tung',
    orderOwner: 'Nguyen Duc Son',
    qcBy: 'QC Hoa',
    csBy: 'unassigned',
    csStatus: CS_STATUSES.UNASSIGNED,
  }),
  createTask(19, {
    id: 'scale-task-ord-10039',
    orderId: 'ORD-10039',
    scaleStatus: SCALE_STATUSES.PENDING,
    groupId: 'GR-339',
    groupType: 'Mockup',
    shop: 'Tan Tan',
    seller: 'Dang Thanh Trung',
    orderOwner: 'Le Bao Anh',
    qcBy: 'QC An',
    csBy: 'cs-anna',
    csStatus: CS_STATUSES.PENDING,
  }),
  createTask(15, {
    id: 'scale-task-ord-10035',
    orderId: 'ORD-10035',
    scaleStatus: SCALE_STATUSES.QC_REJECTED,
    groupId: 'GR-335',
    groupType: 'Fulfillment',
    shop: 'FBA',
    seller: 'Dao Quang Tung',
    orderOwner: 'Tran Hoang',
    qcBy: 'QC Minh',
    csBy: 'cs-minh',
    csStatus: CS_STATUSES.ASSIGNED,
    orderStatus: 'QC Rejected',
  }),
]

const generatedTasks = Array.from({ length: 16 }, (_, index) => {
  const scaleStatuses = [
    SCALE_STATUSES.NEED_SCALE,
    SCALE_STATUSES.PENDING,
    SCALE_STATUSES.COMPLETED,
    SCALE_STATUSES.QC_REJECTED,
  ]
  const csUsers = ['unassigned', 'cs-anna', 'cs-minh', 'cs-linh', 'cs-jade']
  const scaleStatus = scaleStatuses[index % scaleStatuses.length]
  const csBy = csUsers[index % csUsers.length]

  return createTask(index + 1, {
    scaleStatus,
    csBy,
    csStatus:
      scaleStatus === SCALE_STATUSES.COMPLETED
        ? CS_STATUSES.COMPLETED
        : csBy === 'unassigned'
          ? CS_STATUSES.UNASSIGNED
          : index % 2 === 0
            ? CS_STATUSES.ASSIGNED
            : CS_STATUSES.PENDING,
  })
})

let scaleTasks = [...seededTasks, ...generatedTasks]

export const etsyScaleCsUsers = [
  { id: 'Minh', name: 'Minh' },
  { id: 'Linh', name: 'Linh' },
  { id: 'Hung', name: 'Hung' },
  { id: 'Nga', name: 'Nga' },
]

function buildEtsyDetail(overrides = {}) {
  return {
    product: {
      primaryCode: 'B0GRMKNZNV',
      secondaryCode: 'J2522-WT-070326-103',
      psdStatus: 'NORMAL',
      imageUrl: null,
    },
    customization: [
      { label: 'Choose Your Size:', value: '60"x90"', type: 'text' },
      { label: 'Custom Name:', value: "Violeta's Bachelorette", type: 'text' },
      { label: 'Custom Text:', value: 'Last Sail Before the Veil', type: 'text' },
      { label: 'Date/Location:', value: 'Palm Springs, CA', type: 'text' },
      { label: 'Text Color:', value: 'Sky', type: 'text' },
      { label: 'BG Color:', value: 'Bay', type: 'text' },
      { label: 'Priority:', value: 'No, thanks!', type: 'text' },
      { label: 'URL:', value: 'Link', type: 'link', url: 'https://etsy.com' },
      { label: 'Link SP:', value: 'x', type: 'danger' },
      { label: 'Customer Photo:', value: '-', type: 'image', url: null },
    ],
    taskStatus: 'COMPLETE',
    costCenter: {
      vendorProduct: 'Lenful - US Tapestry',
      size: '60"x90"',
    },
    notes: {
      cs: 'carrier:USPS',
      qc: '-',
      buyer: 'Note',
    },
    mockups: [
      { id: 'front', label: 'Front', url: 'https://example.test/front.jpg' },
      { id: 'right-sleeve', label: 'Right Sleeve', url: 'https://example.test/right-sleeve.jpg' },
    ],
    orderInfo: {
      seller: 'Nguyễn Phương Nam',
      quantity: 1,
      fulfillName: '113-1524195-6858656-163604606457041',
    },
    ...overrides,
  }
}

function createEtsyTask(index, overrides = {}) {
  const scaleStatus = overrides.scaleStatus || SCALE_STATUSES.COMPLETED

  return {
    id: overrides.id || `etsy-scale-task-${index}`,
    orderId: overrides.orderId || `ORD-${10100 + index}`,
    orderDate: overrides.orderDate || {
      date: `${20 + (index % 8)} Jun 2026`,
      relative: `${index + 2} days ago`,
    },
    scaleStatus,
    groupId: Object.hasOwn(overrides, 'groupId')
      ? overrides.groupId
      : `GRP-${String(index).padStart(3, '0')}`,
    groupType: Object.hasOwn(overrides, 'groupType') ? overrides.groupType : 'Standard',
    shop: overrides.shop || (index % 2 === 0 ? 'Acct' : 'Acct2'),
    vendor: overrides.vendor || 'Lenful',
    orderStatus: overrides.orderStatus || 'Delivered',
    orderOwner: overrides.orderOwner || (index % 2 === 0 ? 'Nam' : 'Duc'),
    qcBy: overrides.qcBy || (index % 2 === 0 ? 'Lan' : 'Mai'),
    csBy: overrides.csBy || 'Hung',
    csStatus: overrides.csStatus || 'Done',
    scaleFile: overrides.scaleFile || 'Done',
    scaleBy: overrides.scaleBy || overrides.orderOwner || (index % 2 === 0 ? 'Nam' : 'Duc'),
    detail: buildEtsyDetail(overrides.detail),
  }
}

const etsySeededTasks = [
  createEtsyTask(82, {
    id: 'etsy-scale-task-ord-10042',
    orderId: 'ORD-10042',
    orderDate: { date: '27 Jun 2026', relative: '6 days ago' },
    scaleStatus: SCALE_STATUSES.SENT,
    groupId: 'GRP-001',
    groupType: 'Standard',
    shop: 'Acct',
    orderStatus: 'Shipped',
    orderOwner: 'Nam',
    qcBy: 'Lan',
    csBy: 'Minh',
    csStatus: 'In Review',
    scaleFile: 'In Review',
    scaleBy: 'Nam',
  }),
  createEtsyTask(39, {
    id: 'etsy-scale-task-ord-10039',
    orderId: 'ORD-10039',
    orderDate: { date: '25 Jun 2026', relative: '8 days ago' },
    scaleStatus: SCALE_STATUSES.PENDING,
    groupId: null,
    groupType: null,
    shop: 'Main',
    orderStatus: 'Processing',
    orderOwner: 'Hoa',
    qcBy: 'Tuan',
    csBy: 'Linh',
    csStatus: 'Assigned',
    scaleFile: 'Assigned',
    scaleBy: 'Hoa',
  }),
  createEtsyTask(35, {
    id: 'etsy-scale-task-ord-10035',
    orderId: 'ORD-10035',
    orderDate: { date: '22 Jun 2026', relative: '11 days ago' },
    scaleStatus: SCALE_STATUSES.COMPLETED,
    groupId: 'GRP-003',
    groupType: 'Express',
    shop: 'Acct2',
    vendor: 'Lenful',
    orderStatus: 'Delivered',
    orderOwner: 'Duc',
    qcBy: 'Mai',
    csBy: 'Hung',
    csStatus: 'Done',
    scaleFile: 'Done',
    scaleBy: 'Duc',
  }),
]

const etsyGeneratedTasks = Array.from({ length: 28 }, (_, index) =>
  createEtsyTask(index + 4, {
    scaleStatus: index % 4 === 0 ? SCALE_STATUSES.SENT : SCALE_STATUSES.COMPLETED,
    orderStatus: index % 3 === 0 ? 'Delivered' : 'Shipped',
    shop: index % 3 === 0 ? 'Acct' : index % 3 === 1 ? 'Acct2' : 'Main',
    orderOwner: index % 2 === 0 ? 'Nam' : 'Duc',
    qcBy: index % 2 === 0 ? 'Lan' : 'Mai',
    csBy: index % 2 === 0 ? 'Minh' : 'Hung',
  }),
)

let etsyScaleTasks = [...etsySeededTasks, ...etsyGeneratedTasks]

function wait(value) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), DELAY_MS)
  })
}

function isUnset(value) {
  return !value || value === SCALE_ALL_FILTER
}

function matchesSearch(task, search) {
  if (!search?.trim()) return true

  const keyword = search.trim().toLowerCase()
  return [
    task.orderId,
    task.groupId,
    task.groupType,
    task.shop,
    task.seller,
    task.orderOwner,
    task.qcBy,
    task.detail?.product?.sku,
    task.detail?.product?.name,
  ]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(keyword))
}

function matchesStatusTab(task, statusTab) {
  if (!statusTab || statusTab === SCALE_STATUS_TABS.ALL) return true
  if (statusTab === SCALE_STATUS_TABS.CS_UNASSIGNED) return task.csBy === 'unassigned'
  if (statusTab === SCALE_STATUS_TABS.NEED_SCALE) {
    return task.scaleStatus === SCALE_STATUSES.NEED_SCALE
  }
  if (statusTab === SCALE_STATUS_TABS.PENDING) return task.scaleStatus === SCALE_STATUSES.PENDING
  if (statusTab === SCALE_STATUS_TABS.COMPLETED) {
    return task.scaleStatus === SCALE_STATUSES.COMPLETED
  }
  if (statusTab === SCALE_STATUS_TABS.QC_REJECTED) {
    return task.scaleStatus === SCALE_STATUSES.QC_REJECTED
  }

  return true
}

function matchesEtsyStatusTab(task, statusTab) {
  if (!statusTab || statusTab === SCALE_STATUS_TABS.ALL) return true
  if (statusTab === SCALE_STATUS_TABS.NEED_SCALE) {
    return task.scaleStatus === SCALE_STATUSES.NEED_SCALE
  }
  if (statusTab === SCALE_STATUS_TABS.PENDING) return task.scaleStatus === SCALE_STATUSES.PENDING
  if (statusTab === SCALE_STATUS_TABS.COMPLETED) {
    return [SCALE_STATUSES.COMPLETED, SCALE_STATUSES.SENT].includes(task.scaleStatus)
  }
  if (statusTab === SCALE_STATUS_TABS.QC_REJECTED) {
    return task.scaleStatus === SCALE_STATUSES.QC_REJECTED
  }

  return true
}

function matchesEtsySearch(task, search) {
  if (!search?.trim()) return true

  const keyword = search.trim().toLowerCase()
  return [
    task.orderId,
    task.groupId,
    task.groupType,
    task.shop,
    task.vendor,
    task.orderStatus,
    task.orderOwner,
    task.qcBy,
    task.csBy,
    task.csStatus,
    task.detail?.product?.primaryCode,
    task.detail?.product?.secondaryCode,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(keyword))
}

export function getScaleCounts(tasks = scaleTasks) {
  return {
    [SCALE_STATUS_TABS.ALL]: tasks.length,
    [SCALE_STATUS_TABS.CS_UNASSIGNED]: tasks.filter((task) => task.csBy === 'unassigned').length,
    [SCALE_STATUS_TABS.NEED_SCALE]: tasks.filter(
      (task) => task.scaleStatus === SCALE_STATUSES.NEED_SCALE,
    ).length,
    [SCALE_STATUS_TABS.PENDING]: tasks.filter((task) => task.scaleStatus === SCALE_STATUSES.PENDING)
      .length,
    [SCALE_STATUS_TABS.COMPLETED]: tasks.filter(
      (task) => task.scaleStatus === SCALE_STATUSES.COMPLETED,
    ).length,
    [SCALE_STATUS_TABS.QC_REJECTED]: tasks.filter(
      (task) => task.scaleStatus === SCALE_STATUSES.QC_REJECTED,
    ).length,
  }
}

export function getEtsyScaleCounts(tasks = etsyScaleTasks) {
  return {
    [SCALE_STATUS_TABS.ALL]: tasks.length,
    [SCALE_STATUS_TABS.NEED_SCALE]: tasks.filter(
      (task) => task.scaleStatus === SCALE_STATUSES.NEED_SCALE,
    ).length,
    [SCALE_STATUS_TABS.PENDING]: tasks.filter((task) => task.scaleStatus === SCALE_STATUSES.PENDING)
      .length,
    [SCALE_STATUS_TABS.COMPLETED]: tasks.filter((task) =>
      [SCALE_STATUSES.COMPLETED, SCALE_STATUSES.SENT].includes(task.scaleStatus),
    ).length,
    [SCALE_STATUS_TABS.QC_REJECTED]: tasks.filter(
      (task) => task.scaleStatus === SCALE_STATUSES.QC_REJECTED,
    ).length,
  }
}

export function getScaleFilterOptions(tasks = scaleTasks) {
  return {
    shops: [...new Set(tasks.map((task) => task.shop))],
    sellers: [...new Set(tasks.map((task) => task.seller))],
    csUsers: scaleCsUsers,
    csStatuses: Object.values(CS_STATUSES),
  }
}

export function getEtsyScaleFilterOptions(tasks = etsyScaleTasks) {
  return {
    shops: [...new Set(tasks.map((task) => task.shop))],
    vendors: [...new Set(tasks.map((task) => task.vendor))],
    orderStatuses: [...new Set(tasks.map((task) => task.orderStatus))],
    scaleBy: [...new Set(tasks.map((task) => task.scaleBy))],
    qcByCs: [...new Set(tasks.flatMap((task) => [task.qcBy, task.csBy]))],
    scaleFiles: [...new Set(tasks.map((task) => task.scaleFile))],
    csUsers: etsyScaleCsUsers,
  }
}

export function filterScaleTasks(tasks = scaleTasks, filters = {}) {
  const page = Math.max(Number(filters.page) || 1, 1)
  const pageSize = Math.max(Number(filters.pageSize) || SCALE_PAGE_SIZE, 1)

  const filtered = tasks.filter((task) => {
    return (
      matchesStatusTab(task, filters.statusTab) &&
      matchesSearch(task, filters.search) &&
      (isUnset(filters.shop) || task.shop === filters.shop) &&
      (isUnset(filters.seller) || task.seller === filters.seller) &&
      (isUnset(filters.csBy) || task.csBy === filters.csBy) &&
      (isUnset(filters.csStatus) || task.csStatus === filters.csStatus)
    )
  })

  const start = (page - 1) * pageSize

  return {
    items: filtered.slice(start, start + pageSize),
    total: filtered.length,
    counts: getScaleCounts(tasks),
    options: getScaleFilterOptions(tasks),
    lastUpdatedAt: '09:12',
  }
}

export function filterEtsyScaleTasks(tasks = etsyScaleTasks, filters = {}) {
  const page = Math.max(Number(filters.page) || 1, 1)
  const pageSize = Math.max(Number(filters.pageSize) || SCALE_PAGE_SIZE, 1)

  const filtered = tasks.filter((task) => {
    return (
      matchesEtsyStatusTab(task, filters.statusTab) &&
      matchesEtsySearch(task, filters.search) &&
      (isUnset(filters.shop) || task.shop === filters.shop) &&
      (isUnset(filters.vendor) || task.vendor === filters.vendor) &&
      (isUnset(filters.orderStatus) || task.orderStatus === filters.orderStatus) &&
      (isUnset(filters.scaleBy) || task.scaleBy === filters.scaleBy) &&
      (isUnset(filters.qcByCs) || task.qcBy === filters.qcByCs || task.csBy === filters.qcByCs) &&
      (isUnset(filters.scaleFile) || task.scaleFile === filters.scaleFile)
    )
  })

  const start = (page - 1) * pageSize

  return {
    items: filtered.slice(start, start + pageSize),
    total: filtered.length,
    counts: getEtsyScaleCounts(tasks),
    options: getEtsyScaleFilterOptions(tasks),
    lastUpdatedAt: '10:46',
  }
}

export function fetchScaleGroupTasks(filters = {}) {
  // TODO(api): thay mock bằng apiClient.get(ENDPOINTS.SCALE.GROUP_TASKS, { params: filters }).
  return wait(filterScaleTasks(scaleTasks, filters))
}

export function fetchEtsyScaleTasks(filters = {}) {
  // TODO(api): thay mock bằng apiClient.get(ENDPOINTS.SCALE.ETSY_TASKS, { params: filters }).
  return wait(filterEtsyScaleTasks(etsyScaleTasks, filters))
}

export function assignScaleTaskCs({ taskId, csBy }) {
  // TODO(api): thay mock bằng apiClient.patch(ENDPOINTS.SCALE.ASSIGN_CS(taskId), { csBy }).
  const nextCsBy = csBy || 'unassigned'
  const csStatus = nextCsBy === 'unassigned' ? CS_STATUSES.UNASSIGNED : CS_STATUSES.ASSIGNED

  scaleTasks = scaleTasks.map((task) =>
    task.id === taskId ? { ...task, csBy: nextCsBy, csStatus } : task,
  )

  return wait(scaleTasks.find((task) => task.id === taskId))
}

export function assignEtsyScaleTaskCs({ taskId, csBy }) {
  // TODO(api): thay mock bằng apiClient.patch(ENDPOINTS.SCALE.ETSY_ASSIGN_CS(taskId), { csBy }).
  etsyScaleTasks = etsyScaleTasks.map((task) =>
    task.id === taskId ? { ...task, csBy, csStatus: csBy ? 'Assigned' : 'No data' } : task,
  )

  return wait(etsyScaleTasks.find((task) => task.id === taskId))
}

export function updateScaleTaskNote({ taskId, noteType = 'cs', note }) {
  // TODO(api): thay mock bằng apiClient.patch(ENDPOINTS.SCALE.TASK(taskId), { csNote: note }).
  scaleTasks = scaleTasks.map((task) =>
    task.id === taskId
      ? {
          ...task,
          detail: {
            ...task.detail,
            csNote: noteType === 'cs' ? note || '' : task.detail.csNote,
            notes: {
              ...task.detail.notes,
              [noteType]: note || '',
            },
          },
        }
      : task,
  )

  return wait(scaleTasks.find((task) => task.id === taskId))
}

export function updateEtsyScaleTaskNote({ taskId, noteType, note }) {
  // TODO(api): thay mock bằng apiClient.patch(ENDPOINTS.SCALE.ETSY_TASK(taskId), { noteType, note }).
  etsyScaleTasks = etsyScaleTasks.map((task) =>
    task.id === taskId
      ? {
          ...task,
          detail: {
            ...task.detail,
            notes: {
              ...task.detail.notes,
              [noteType]: note || '',
            },
          },
        }
      : task,
  )

  return wait(etsyScaleTasks.find((task) => task.id === taskId))
}

export function updateScaleTaskMockups({ taskId, mockups }) {
  // TODO(api): thay mock bằng apiClient.patch(ENDPOINTS.SCALE.MOCKUPS(taskId), { mockups }).
  scaleTasks = scaleTasks.map((task) =>
    task.id === taskId ? { ...task, detail: { ...task.detail, mockups: mockups || [] } } : task,
  )

  return wait(scaleTasks.find((task) => task.id === taskId))
}

export function updateEtsyScaleTaskMockups({ taskId, mockups }) {
  // TODO(api): thay mock bằng apiClient.patch(ENDPOINTS.SCALE.ETSY_MOCKUPS(taskId), { mockups }).
  etsyScaleTasks = etsyScaleTasks.map((task) =>
    task.id === taskId ? { ...task, detail: { ...task.detail, mockups: mockups || [] } } : task,
  )

  return wait(etsyScaleTasks.find((task) => task.id === taskId))
}

export function resetScaleTasksForTest() {
  scaleTasks = [...seededTasks, ...generatedTasks]
  etsyScaleTasks = [...etsySeededTasks, ...etsyGeneratedTasks]
}
